const TelegramBot = require('node-telegram-bot-api');
const { ConversationFlow, InteractiveMenus, FlowStates } = require('../../services/conversationFlow');
const { UserPersona } = require('../../models/persona');
const ConsultationManager = require('../../services/consultationManager');
const DoctorRouter = require('../../services/doctorRouter');
const PaymentService = require('../../services/paymentService');
const MasterDataManager = require('../../services/masterDataManager');
const DoctorPersistence = require('../../services/doctorPersistence');

const consultationManager = new ConsultationManager();
const doctorRouter = new DoctorRouter();
const paymentService = new PaymentService();
const masterData = new MasterDataManager();
const doctorPersistence = new DoctorPersistence();
const conversationFlow = new ConversationFlow(consultationManager, doctorRouter, paymentService);

class TelegramAdapter {
  constructor() {
    this.bot = null;
  }

  async initialize(token) {
    this.bot = new TelegramBot(token, { 
      polling: false,
      request: {
        agentOptions: {
          keepAlive: true,
          keepAliveMsecs: 1000
        }
      }
    });

    this.bot.on('polling_error', async (err) => {
      console.error(`[polling_error]:`, err.message || err);
    });

    try {
      await this.bot.startPolling();
    } catch (err) {
      console.error('Failed to start polling:', err.message);
    }
    
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      await this.bot.sendMessage(chatId, InteractiveMenus.main, { parse_mode: 'Markdown' });
    });

    this.bot.onText(/\/register/, async (msg) => {
      const chatId = msg.chat.id;
      await this.bot.sendMessage(chatId, 'Doctor registration:\nUse API or contact admin.');
    });

    this.bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text || '';

      if (text.startsWith('/')) return;

      const persona = new UserPersona(String(chatId));

      if (persona.isDoctor()) {
        await this.handleDoctor(chatId, text);
        return;
      }

      if (persona.isAdmin() || persona.isSupport()) {
        await this.handleAdmin(chatId, text);
        return;
      }

      const session = consultationManager.getSession(String(chatId));
      const idleResult = conversationFlow.checkIdle(String(chatId));
      if (idleResult) {
        await this.notifyAdminsAbandonment(String(chatId), session, 'idle');
        await this.bot.sendMessage(chatId, idleResult.response, { parse_mode: 'Markdown' });
        return;
      }

      const flowResult = conversationFlow.createFlowHandler(String(chatId), text);

      if (flowResult.nextState && flowResult.response) {
        consultationManager.updateSession(String(chatId), { flowState: flowResult.nextState });
        await this.bot.sendMessage(chatId, flowResult.response, { parse_mode: 'Markdown' });

        if (flowResult.nextState === FlowStates.PAYMENT_PENDING && flowResult.data?.summary) {
          await this.notifyAdminsPaymentRequest(flowResult.data.summary);
        }

        if (flowResult.data?.cancelled) {
          await this.notifyAdminsAbandonment(String(chatId), session, 'cancel');
        }

        if (flowResult.nextState === FlowStates.ADMIN_FALLBACK) {
          await this.notifyAdmin(chatId, flowResult.data.sessionSummary);
        }

        if (flowResult.data?.consultationCreated) {
          const updatedSession = consultationManager.getSession(String(chatId));
          const doctor = doctorPersistence.getDoctorById(updatedSession.doctorId);
          if (doctor) await this.notifyDoctorOfNewConsultation(String(chatId), updatedSession, doctor);
        }
      } else {
        const response = await this.routeQuery(chatId, text, session);
        await this.bot.sendMessage(chatId, response.message, { parse_mode: 'Markdown' });
      }
    });

    this.bot.on('photo', async (msg) => {
      const chatId = msg.chat.id;
      const photo = msg.photo[msg.photo.length - 1];
      const fileId = photo.file_id;
      
      const session = consultationManager.getSession(String(chatId));
      const mediaEntry = { type: 'image', fileId, receivedAt: new Date() };
      consultationManager.addMediaToSession(String(chatId), mediaEntry);

      const existingConsultation = consultationManager.getConsultationByPatient(String(chatId));
      if (existingConsultation) {
        const currentRaw = existingConsultation.rawQueryMedia || [];
        currentRaw.push(mediaEntry);
        consultationManager.storeRawQueryData(existingConsultation.id, currentRaw);
      }
      
      await this.bot.sendMessage(
        chatId,
        `Report received. Total docs: ${session.media.length}. Type 'CONNECT' after payment.`
      );
    });

    this.bot.on('document', async (msg) => {
      const chatId = msg.chat.id;
      const document = msg.document;
      
      const session = consultationManager.getSession(String(chatId));
      const mediaEntry = { type: 'document', fileId: document.file_id, receivedAt: new Date() };
      consultationManager.addMediaToSession(String(chatId), mediaEntry);

      const existingConsultation = consultationManager.getConsultationByPatient(String(chatId));
      if (existingConsultation) {
        const currentRaw = existingConsultation.rawQueryMedia || [];
        currentRaw.push(mediaEntry);
        consultationManager.storeRawQueryData(existingConsultation.id, currentRaw);
      }
      
      await this.bot.sendMessage(
        chatId,
        `Document received. Total docs: ${session.media.length}. Type 'CONNECT' after payment.`
      );
    });
  }

  async handleDoctor(chatId, message) {
    const chatIdStr = String(chatId);
    const doctor = doctorPersistence.getDoctors().find(
      d => d.telegramId === chatIdStr || String(d.phoneNumber).replace('+', '') === chatIdStr
    );

    if (!doctor) {
      await this.bot.sendMessage(chatId, 'Unauthorized doctor. Please register via API.', { parse_mode: 'Markdown' });
      return;
    }

    const consultation = Array.from(consultationManager.consultations.values())
      .find(c => c.doctorId === doctor.id && c.status === 'active');

    if (!consultation) {
      await this.bot.sendMessage(chatId, 'No active consultation. Wait for assignment.');
      return;
    }

    const session = consultationManager.getSession(consultation.patientPhone);
    if (!session.paymentVerified) {
      await this.bot.sendMessage(chatId, 
        `Patient has not completed payment yet.\nDocs collected: ${session.media?.length || 0}.`, 
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // For caregivers, forward to their chat instead of patient phone
    const targetChatId = session.isCaregiver ? consultation.patientPhone : consultation.patientPhone;
    
    await this.bot.sendMessage(targetChatId, message, { parse_mode: 'Markdown' });
    consultationManager.addMessage(consultation.id, 'doctor', message);
    
    await this.bot.sendMessage(chatId, 'Message sent to patient/caregiver.');
  }

  async handleAdmin(chatId, message) {
    const trimmed = message.trim();
    
    if (trimmed === '1' || trimmed.toLowerCase() === 'list doctors') {
      const doctors = doctorPersistence.getDoctors().map(d => 
        `${d.id}: ${d.name} (${d.specialty}) - ${d.available ? 'Available' : 'Busy'}`
      ).join('\n');
      await this.bot.sendMessage(chatId, `Doctors:\n${doctors}`);
      return;
    }
    
    if (trimmed.toLowerCase() === 'list specialties') {
      const specialties = masterData.getSpecialties();
      await this.bot.sendMessage(chatId, `Specialties:\n${specialties.map(s => `- ${s}`).join('\n')}`);
      return;
    }
    
    if (trimmed.toLowerCase() === 'list cancer types' || trimmed.toLowerCase() === 'list cancers') {
      const cancers = masterData.getCancerTypes();
      await this.bot.sendMessage(chatId, `Cancer Types:\n${cancers.map(c => `- ${c}`).join('\n')}`);
      return;
    }

    const payMatch = trimmed.match(/^PAY\s+(\S+)\s+(\d+)\s+(\d+)\s+(\d+)\s*(.*)$/i);
    if (payMatch) {
      const [, patientPhone, amount, researchDiscount, commercialDiscount, note] = payMatch;
      const patientSession = consultationManager.getSession(patientPhone);
      
      consultationManager.updateSession(patientPhone, {
        pendingPayment: {
          baseAmount: parseInt(amount, 10),
          researchDiscountPercent: parseInt(researchDiscount, 10),
          commercialDiscountPercent: parseInt(commercialDiscount, 10),
          note: note || ''
        },
        flowState: FlowStates.DATA_SHARING_CONSENT
      });

      const baseAmount = parseInt(amount, 10);
      const researchFinal = Math.round(baseAmount * (1 - parseInt(researchDiscount, 10) / 100));
      const commercialFinal = Math.round(baseAmount * (1 - parseInt(commercialDiscount, 10) / 100));

      await this.bot.sendMessage(patientPhone, 
        `💳 *Choose Data Sharing Option*\n\nConsultation fee: ₹${baseAmount}\n\n1. Yes, allow research use → ${researchDiscount}% off → **₹${researchFinal}**\n2. Yes, allow commercial use → ${commercialDiscount}% off → **₹${commercialFinal}**\n3. No, do not allow → No discount → **₹${baseAmount}**\n\nReply with 1, 2, or 3`,
        { parse_mode: 'Markdown' }
      );
      await this.bot.sendMessage(chatId, `✅ Payment options sent to ${patientPhone}`);
      return;
    }
    
    const regDoctorMatch = trimmed.match(/^REGISTER\s+(\S+)\s+(\S+)\s+(\S+)\s+(.*)$/i);
    if (regDoctorMatch) {
      const [, name, telegramId, specialty, cancerTypesStr] = regDoctorMatch;
      const cancerTypes = cancerTypesStr.split(',').map(c => c.trim()).filter(c => c);
      
      const doctor = doctorPersistence.addDoctor({
        id: `doc_${Date.now()}`,
        name,
        telegramId,
        specialty,
        cancerTypes,
        consultationFee: 1500
      });
      
      await this.bot.sendMessage(chatId, `✅ Doctor registered: ${doctor.id} (${doctor.name})`);
      return;
    }

    await this.bot.sendMessage(chatId, 
      'Admin commands:\n1. List doctors\n2. List specialties\n3. List cancer types\n4. PAY <phone> <amount> <researchDiscount%> <commercialDiscount%> <note>\n5. REGISTER <name> <telegramId> <specialty> <cancerTypes>',
      { parse_mode: 'Markdown' }
    );
  }

  async notifyAdminsPaymentRequest(summary) {
    const admins = process.env.ADMIN_PHONES ? process.env.ADMIN_PHONES.split(',') : [];
    
    for (const admin of admins) {
      try {
        await this.bot.sendMessage(admin, 
          `📩 *Payment Request*\n\nPatient: ${summary.phoneNumber}\nName: ${summary.name}\nCancer: ${summary.cancerType}\nDocs: ${summary.mediaCount}\nConsultations: ${summary.consultationCount}\nData Consent: ${summary.dataSharingConsent ? 'Yes' : 'No'}\nCaregiver: ${summary.isCaregiver ? 'Yes' : 'No'}\n\nSet discount based on:\n- Complexity: general(0-10%), specialized(10-25%), complex(25-40%)\n- Query count: more queries = higher discount\n- Data volume: more media = higher discount\n\nReply: PAY <phone> <amount> <researchDiscount%> <commercialDiscount%> <note>`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        console.error(`Failed to notify admin ${admin}:`, error);
      }
    }
  }

  async routeQuery(chatId, message, session) {
    const intent = this.classifyIntent(message);
    
    switch (intent) {
      case 'payment':
        const paymentInfo = await paymentService.generatePaymentLink(String(chatId), 1500);
        consultationManager.updateSession(String(chatId), { paymentTransaction: paymentInfo.transactionId });
        return { message: `Please use the menu to request payment. Your admin will send a customized payment link.\n\n${paymentInfo.message}` };
        
      case 'oncology_query':
        const cancerType = this.extractCancerType(message);
        consultationManager.updateSession(String(chatId), { cancerType });
        return { message: `Detected: ${cancerType} cancer.\nComplete payment to connect with a specialist.` };
        
      case 'doctor_connect':
        return await this.handleConnectRequest(String(chatId), session);
        
      default:
        return { message: InteractiveMenus.main };
    }
  }

  async handleConnectRequest(chatId, session) {
    const isVerified = session.paymentTransaction && await paymentService.verifyPayment(session.paymentTransaction);
    if (!isVerified) {
      return { message: `Payment required.\nSelect 'My Consultations' from menu to check payment or request payment first.\nUploaded docs: ${session.media?.length || 0}` };
    }

    const doctor = await doctorRouter.findAvailableDoctor(session.cancerType);
    if (!doctor) return { message: "No doctors available currently." };
    
    consultationManager.updateSession(chatId, { paymentVerified: true });
    consultationManager.createConsultation(chatId, doctor.id, session);
    
    const connectedMedia = session.media || [];
    if (connectedMedia.length > 0) {
      const doctorTelegramId = doctor.telegramId || String(doctor.phoneNumber).replace('+', '');
      await this.bot.sendMessage(doctorTelegramId, 
        `📩 New Consultation\nPatient Chat ID: ${chatId}\nDocs: ${connectedMedia.length}\nAsk patient to re-send docs.`
      ).catch(() => {});
    }
    
    return { message: `Connected to Dr. ${doctor.name}.\nConsultation fee: ₹${doctor.fee}` };
  }

  notifyDoctorOfNewConsultation(patientChatId, session, doctor) {
    if (!doctor.telegramId && !doctor.phoneNumber) return;
    const doctorTelegramId = doctor.telegramId || String(doctor.phoneNumber).replace('+', '');
    const connectedMedia = session.media || [];
    const isCaregiverNote = session.isCaregiver ? `\n\nNote: Caregiver session. Patient: ${session.patientName}` : '';
    return this.bot.sendMessage(doctorTelegramId, 
      `📩 New Consultation\nPatient Chat ID: ${patientChatId}\nDocs: ${connectedMedia.length}\nAsk patient to re-send docs if needed.${isCaregiverNote}`
    ).catch(() => {});
  }

  classifyIntent(message) {
    const intents = {
      payment: [/payment|pay|upi|razorpay|fee|cost/i],
      oncology_query: [/cancer|tumor|chemotherapy|radiation|biopsy/i],
      doctor_connect: [/doctor|specialist|connect/i],
      followup: [/follow.?up|status|update/i]
    };

    for (const [intent, patterns] of Object.entries(intents)) {
      if (patterns.some(pattern => pattern.test(message))) return intent;
    }
    return 'general_query';
  }

  extractCancerType(message) {
    const types = { 
      lung: /lung/i, 
      breast: /breast/i, 
      prostate: /prostate/i, 
      liver: /liver/i, 
      pancreatic: /pancreatic/i,
      ovarian: /ovarian/i, 
      blood: /blood|leukemia|lymphoma/i 
    };
    for (const [type, pattern] of Object.entries(types)) {
      if (pattern.test(message)) return type;
    }
    return 'general';
  }

  async sendToPatient(phoneNumber, message) {
    try {
      await this.bot.sendMessage(phoneNumber, message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Telegram send error:', error);
    }
  }

  async notifyAdmin(patientId, summary) {
    const adminPhones = (process.env.ADMIN_PHONES || '').split(',').filter(p => p);
    
    for (const admin of adminPhones) {
      try {
        await this.bot.sendMessage(admin, summary, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error(`Failed to notify admin ${admin}:`, error);
      }
    }
  }

  async notifyAdminsAbandonment(patientPhone, session, reason) {
    const admins = process.env.ADMIN_PHONES ? process.env.ADMIN_PHONES.split(',') : [];
    const stage = session?.flowState || 'unknown';
    const cancerType = session?.cancerType || 'Not selected';
    const docsCount = session?.media?.length || 0;
    const reasonLabel = reason === 'idle' ? 'Inactivity timeout (30 min)' : 'User cancelled';
    const caregiverNote = session?.isCaregiver ? `\nCaregiver for: ${session.patientName}` : '';
    
    for (const admin of admins) {
      try {
        await this.bot.sendMessage(admin, 
          `⚠️ *Patient Abandoned*\n\nPatient: ${patientPhone}\nStage: ${stage}\nReason: ${reasonLabel}\nCancer: ${cancerType}\nDocs uploaded: ${docsCount}${caregiverNote}`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        console.error(`Failed to notify admin ${admin}:`, error);
      }
    }
  }
}

module.exports = TelegramAdapter;