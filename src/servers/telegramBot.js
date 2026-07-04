const TelegramBot = require('node-telegram-bot-api');
const { ConversationFlow, InteractiveMenus, FlowStates } = require('../../services/conversationFlow');
const { UserPersona, PersonaTypes } = require('../../models/persona');
const ConsultationManager = require('../../services/consultationManager');
const DoctorRouter = require('../../services/doctorRouter');
const PaymentService = require('../../services/paymentService');
const MasterDataManager = require('../../services/masterDataManager');
const DoctorPersistence = require('../../services/doctorPersistence');
const { getAdminWelcome } = require('../../services/authGuard');
const UserRegistry = require('../../services/userRegistry');

const doctorRouter = new DoctorRouter();
const consultationManager = new ConsultationManager(doctorRouter);
const paymentService = new PaymentService();
const masterData = new MasterDataManager();
const doctorPersistence = new DoctorPersistence();
const userRegistry = new UserRegistry();
const conversationFlow = new ConversationFlow(consultationManager, doctorRouter, paymentService, userRegistry);

const REPORT_TYPE_LABELS = {
  pathology: "Pathology",
  radiology: "Radiology",
  lab_results: "Lab Results",
  prescription: "Prescription",
  discharge_summary: "Discharge Summary",
  biopsy: "Biopsy",
  surgical: "Surgical"
};

class TelegramAdapter {
  constructor() {
    this.bot = null;
  }

  getRoleLabel(type) {
    const labels = {
      [PersonaTypes.SUPER_ADMIN]: 'Super Admin',
      [PersonaTypes.ADMIN]: 'Admin',
      [PersonaTypes.DOCTOR]: 'Doctor',
      [PersonaTypes.CAREGIVER]: 'Caregiver',
      [PersonaTypes.PATIENT]: 'Patient'
    };
    return labels[type] || 'Unknown';
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

    this.bot.on('polling_error', (err) => {
      const msg = err?.response?.body?.description || err.message || err;
      if (msg.includes('timeout') || msg.includes('ETIMEDOUT') || msg.includes('EAI_AGAIN')) {
        console.warn(`[polling_error]: Network error (will retry): ${msg.substring(0, 100)}`);
      } else {
        console.error(`[polling_error]: ${msg}`);
      }
    });

    try {
      await this.bot.startPolling({ params: { timeout: 30 } });
    } catch (err) {
      console.error('Failed to start polling:', err.message);
    }
    
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const persona = new UserPersona(String(chatId));
      const roleLabel = this.getRoleLabel(persona.type);
      
      const session = consultationManager.getSession(String(chatId));
      
      // Check if mobile number is needed for new users
      if (!session.phoneNumber && !session.mobileSkipped && !persona.isAdmin()) {
        consultationManager.updateSession(String(chatId), { flowState: FlowStates.MOBILE_COLLECTION });
        await this.bot.sendMessage(chatId, InteractiveMenus.mobileCollection, { parse_mode: 'Markdown' });
        return;
      }
      
      // Detected admin/support/doctor/caregiver - go directly to their role
      if (persona.isAdmin() || persona.isSupport()) {
        const inAdminFlow = session?.flowState === FlowStates.ADMIN_MENU;
        if (!inAdminFlow) {
          consultationManager.updateSession(String(chatId), { flowState: FlowStates.ADMIN_MENU });
        }
        const pendingCount = consultationManager.getPendingForAdmin().length;
        const activeCount = Array.from(consultationManager.consultations.values())
          .filter(c => c.status === 'active').length;
        await this.bot.sendMessage(chatId, `${InteractiveMenus.adminMenu}\n\nPending: ${pendingCount} | Active: ${activeCount}`, { parse_mode: 'Markdown' });
      } else if (persona.isCaregiver()) {
        // Check if caregiver has linked patient
        const linkedPatientPhone = session?.linkedPatientPhone;
        if (!linkedPatientPhone) {
          // Need to link to patient first
          consultationManager.updateSession(String(chatId), { flowState: FlowStates.CAREGIVER_PATIENT_LINK });
          await this.bot.sendMessage(chatId, InteractiveMenus.caregiverPatientLink, { parse_mode: 'Markdown' });
        } else {
          const linkedSession = consultationManager.getSession(linkedPatientPhone);
          const patientInfo = linkedSession?.patientProfile?.name ? `\nPatient: ${linkedSession.patientProfile.name}` : '';
          consultationManager.updateSession(String(chatId), { flowState: FlowStates.CAREGIVER_MENU });
          await this.bot.sendMessage(chatId, InteractiveMenus.caregiverMenu(linkedSession?.patientProfile?.name), { parse_mode: 'Markdown' });
        }
      } else if (persona.isDoctor()) {
        const activeConsultation = Array.from(consultationManager.consultations.values())
          .find(c => c.doctorId === persona.type && c.status === 'active');
        const consultationInfo = activeConsultation ? `\nActive: ${activeConsultation.id}` : '';
        await this.bot.sendMessage(chatId, `*${roleLabel} Mode*${consultationInfo}\n\nSend /menu for options or wait for consultation.\nUse MSG_ADMIN <message> to contact your admin.\n\n9. Status\n0. Switch Role`, { parse_mode: 'Markdown' });
      } else {
        // All other users (patients or unverified) - use last selected persona if profile exists
        if (session?.patientProfile) {
          const lastPersona = session.selectedPersona || persona.type;
          const mediaCount = session?.media?.length || 0;
          const consultation = consultationManager.getConsultationByPatient(String(chatId));
          const consultationStatus = consultation ? ` | Consultation: ${consultation.status}` : '';
          await this.bot.sendMessage(chatId, `Welcome back! Using last role: ${lastPersona}\nDocs: ${mediaCount}${consultationStatus}\n\n${InteractiveMenus.main(lastPersona)}`, { parse_mode: 'Markdown' });
        } else {
          await this.bot.sendMessage(chatId, `Welcome! Please select your role:\n\n${InteractiveMenus.personaSelect(persona.type)}`, { parse_mode: 'Markdown' });
        }
      }
    });

    this.bot.onText(/\/register/, async (msg) => {
      const chatId = msg.chat.id;
      await this.bot.sendMessage(chatId, InteractiveMenus.doctorRegister);
    });

    this.bot.onText(/\/accept/, async (msg) => {
      const chatId = msg.chat.id;
      const doctors = doctorPersistence.getPendingDoctors();
      const invited = doctors.find(d => d.status === 'invited' && 
        (d.telegramId === String(chatId) || d.phoneNumber === String(chatId)));
      
      if (!invited) {
        await this.bot.sendMessage(chatId, '❌ No pending invitation found.\nYou may be registered already or need to register first.');
        return;
      }
      
      const accepted = doctorPersistence.acceptDoctorInvitation(invited.id, String(chatId));
      if (accepted) {
        await this.bot.sendMessage(chatId, `✅ Invitation accepted! You are now Dr. ${accepted.name}.\nSend /start to begin.`);
      }
    });
    this.bot.onText(/\/clear/, async (msg) => {
      const chatId = String(msg.chat.id);
      const session = consultationManager.getSession(chatId);
      const preservedProfile = {
        patientProfile: session.patientProfile,
        media: session.media,
        isCaregiver: session.isCaregiver,
        caregiverConsentGiven: session.caregiverConsentGiven,
        caregiverName: session.caregiverName,
        patientName: session.patientName,
        caregiverRelationship: session.caregiverRelationship,
        caregiverReason: session.caregiverReason
      };
      
      // Clean up active consultation
      if (session.consultationId) {
        const consultation = consultationManager.getConsultationByPatient(chatId);
        if (consultation) {
          consultationManager.endConsultation(consultation.id);
        }
        consultationManager.releaseDoctorIfAssigned(chatId);
      }
      
      // Clean up pending consultation
      const pendingConsultation = consultationManager.getPendingConsultationByPatient(chatId);
      if (pendingConsultation) {
        consultationManager.consultations.delete(pendingConsultation.id);
        consultationManager.persistence.saveConsultations();
      }
      
      consultationManager.sessions.delete(chatId);
      consultationManager.persistence.saveSessions();
      
      // Recreate session with preserved profile
      consultationManager.updateSession(chatId, {
        flowState: FlowStates.WELCOME,
        ...preservedProfile
      });
      
      const admins = process.env.ADMIN_PHONES ? process.env.ADMIN_PHONES.split(',') : [];
      for (const admin of admins) {
        try {
          await this.bot.sendMessage(admin, 
            `🗑️ *Chat Cleared*\n\nUser: ${chatId}\nConsultation: ${session.consultationId || pendingConsultation?.id || 'none'}\nProfile preserved.`,
            { parse_mode: 'Markdown' }
          );
        } catch (e) {}
      }
      
      await this.bot.sendMessage(chatId, '🗑️ Chat history cleared. Profile and documents preserved.\nSend /start or /resume to begin.', { parse_mode: 'Markdown' });
    });

    this.bot.onText(/\/resume/, async (msg) => {
      const chatId = String(msg.chat.id);
      const session = consultationManager.getSession(chatId);
      const persona = new UserPersona(chatId);
      
      if (session?.patientProfile) {
        await this.bot.sendMessage(chatId, `📋 *Session Resumed*\n\nProfile: ${session.patientProfile.name || 'set'}\nDocs: ${session.media?.length || 0}\n\n${InteractiveMenus.main(session.selectedPersona || persona.type)}`, { parse_mode: 'Markdown' });
      } else {
        await this.bot.sendMessage(chatId, `No previous session found. Use /start to begin.`);
      }
    });

    this.bot.onText(/\/profile/, async (msg) => {
      const chatId = String(msg.chat.id);
      const session = consultationManager.getSession(chatId);
      const profile = session?.patientProfile || {};
      const isCaregiver = session?.isCaregiver || false;
      
      const profileText = `📋 *Your Profile*\n\n*Name:* ${profile.name || 'Not set'}\n*Age:* ${profile.age || 'Not set'}\n*Gender:* ${profile.gender || 'Not set'}\n*Aadhaar:* ${profile.aadhaarNumber ? 'Provided' : 'Not set'}\n*Address:* ${profile.address || 'Not set'}\n*State:* ${profile.state || 'Not set'}\n*Cancer Type:* ${profile.cancerType || 'Not set'}\n*Treating Hospital:* ${profile.treatingHospital || 'Not set'}\n*Treatment Status:* ${profile.treatmentStatus || 'Not set'}\n*Medical Reports:* ${profile.medicalReports?.length || 0} uploaded\n*Emergency Contact:* ${profile.emergencyContactName || 'Not set'} (${profile.emergencyContactRelation || 'Not set'})\n*Discount Category:* ${profile.discountCategory || 'none'}\n*Discount Status:* ${profile.discountVerificationStatus || 'not_applied'}\n${isCaregiver && profile.caregiverName ? `\n*Caregiver Name:* ${profile.caregiverName}` : ''}\n${isCaregiver && profile.patientName ? `*Patient Name:* ${profile.patientName}` : ''}\n${isCaregiver && profile.caregiverRelationship ? `*Relationship:* ${profile.caregiverRelationship}` : ''}`;
      
      await this.bot.sendMessage(chatId, profileText, { parse_mode: 'Markdown' });
    });

    this.bot.onText(/\/apply/, async (msg) => {
      const chatId = String(msg.chat.id);
      
      const text = (msg.text || '').replace(/^\/apply\s*/i, '').trim().toLowerCase();
      const validRoles = ['doctor', 'caregiver', 'support'];
      
      if (!text) {
        await this.bot.sendMessage(chatId, `📝 *Apply for Role*\n\nUsage: /apply <role>\n\nAvailable roles: ${validRoles.join(', ')}\n\nRoles require admin approval.`, { parse_mode: 'Markdown' });
        return;
      }
      
      if (validRoles.includes(text)) {
        userRegistry.requestRole(chatId, text);
        await this.bot.sendMessage(chatId, `✅ Role request for *${text}* submitted. Admin will review and approve.`, { parse_mode: 'Markdown' });
      } else {
        await this.bot.sendMessage(chatId, `❌ Invalid role. Available roles: ${validRoles.join(', ')}`, { parse_mode: 'Markdown' });
      }
    });

    this.bot.onText(/\/roles/, async (msg) => {
      const chatId = String(msg.chat.id);
      const user = userRegistry.getUser(chatId) || userRegistry.getUserByPhone(chatId);
      const roles = user?.appliedRoles || [];
      const roleStatus = user?.roleStatus || {};
      
      let text = `🔖 *My Roles*\n\n`;
      if (roles.length === 0) {
        text += `_No roles applied yet._\n\n`;
      } else {
        roles.forEach(role => {
          const status = roleStatus[role] || 'unknown';
          const statusEmoji = status === 'approved' ? '✅' : status === 'pending' ? '⏳' : '❌';
          text += `${statusEmoji} *${role}* - ${status}\n`;
        });
      }
      text += `\nUse /apply <role> to request a new role.`;
      
      await this.bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    });

    this.bot.onText(/\/feebased/, async (msg) => {
      const chatId = String(msg.chat.id);
      const persona = new UserPersona(chatId);
      
      if (!persona.isAdmin() && !persona.isDoctor()) {
        await this.bot.sendMessage(chatId, '❌ Only admins and doctors can set fees.');
        return;
      }
      
      const args = (msg.text || '').replace(/^\/feebased\s*/i, '').trim().split(/\s+/);
      const phoneNumber = args[0];
      const amount = parseInt(args[1]);
      const adminNote = args.slice(2).join(' ') || '';
      
      if (!phoneNumber || !amount) {
        await this.bot.sendMessage(chatId, 
          `💰 *Set Consultation Fee*\n\nUsage: /feebased PHONE AMOUNT [NOTE]\n\nSets fee for patient's pending consultation.\n\nExample: /feebased 9876543210 1500 "complex case with multiple reports"`,
          { parse_mode: 'Markdown' }
        );
        return;
      }
      
      const session = consultationManager.getSession(phoneNumber);
      if (!session || !session.paymentTransaction) {
        await this.bot.sendMessage(chatId, `❌ No pending payment request found for ${phoneNumber}`);
        return;
      }
      
      const success = conversationFlow.setFee(phoneNumber, session.paymentTransaction, amount, adminNote);
      
      if (success) {
        await this.bot.sendMessage(userRegistry.getUserByPhone(phoneNumber)?.chatId || phoneNumber, 
          `💰 *Fee Determined*\n\nYour consultation fee: ₹${amount}\n${adminNote ? `_${adminNote}_` : ''}\n\nAdmin will send payment link shortly.`,
          { parse_mode: 'Markdown' }
        ).catch(() => {});
        
        await this.bot.sendMessage(chatId, 
          `✅ Fee set: ₹${amount} for ${phoneNumber}${adminNote ? `\nNote: ${adminNote}` : ''}`,
          { parse_mode: 'Markdown' }
        );
      } else {
        await this.bot.sendMessage(chatId, `❌ Failed to set fee.`);
      }
    });

    this.bot.onText(/\/menu/, async (msg) => {
      const chatId = msg.chat.id;
      const session = consultationManager.getSession(String(chatId));
      const flowState = session?.flowState || FlowStates.WELCOME;
      const persona = new UserPersona(String(chatId));
      
      if (flowState === FlowStates.ADMIN_MENU) {
        const pendingCount = consultationManager.getPendingForAdmin().length;
        const activeCount = Array.from(consultationManager.consultations.values())
          .filter(c => c.status === 'active').length;
        await this.bot.sendMessage(chatId, `${InteractiveMenus.adminMenu}\n\nPending: ${pendingCount} | Active: ${activeCount}`, { parse_mode: 'Markdown' });
      } else if (flowState === FlowStates.DOCTOR_MENU) {
        const doctors = doctorPersistence.getDoctors();
        const doctor = doctors.find(d => d.telegramId === String(chatId) ||
          String(d.phoneNumber).replace('+', '') === String(chatId));
        const hasActive = !!Array.from(consultationManager.consultations.values())
          .find(c => c.doctorId === doctor?.id && c.status === 'active');
        await this.bot.sendMessage(chatId, InteractiveMenus.doctorMenu(doctor?.name || 'Doctor', hasActive), { parse_mode: 'Markdown' });
      } else if (flowState === FlowStates.CAREGIVER_MENU) {
        await this.bot.sendMessage(chatId, InteractiveMenus.caregiverMenu(session?.patientName), { parse_mode: 'Markdown' });
      } else {
        const selectedPersona = session?.selectedPersona || persona.type;
        await this.bot.sendMessage(chatId, InteractiveMenus.main(selectedPersona), { parse_mode: 'Markdown' });
      }
    });

this.bot.on('message', async (msg) => {
       try {
         const chatId = msg.chat.id;
         const text = msg.text || '';

         if (text.startsWith('/')) return;

         const persona = new UserPersona(String(chatId));

         if (persona.isDoctor()) {
           await this.handleDoctor(chatId, text);
           return;
         }

         const session = consultationManager.getSession(String(chatId));
         const inPersonaSelect = session?.flowState === FlowStates.PERSONA_SELECT;
         
         if (persona.isAdmin() || persona.isSupport()) {
           const inAdminFlow = session?.flowState === FlowStates.ADMIN_MENU;
           
           if (inAdminFlow) {
             const flowResult = conversationFlow.handleAdminMenuSelection(text, String(chatId));
             if (flowResult.nextState) {
               consultationManager.updateSession(String(chatId), { flowState: flowResult.nextState });
             }
             await this.bot.sendMessage(chatId, flowResult.response, { parse_mode: 'Markdown' });
             return;
        }
        
        if (inPersonaSelect || session?.flowState === FlowStates.WELCOME) {
          const flowResult = conversationFlow.createFlowHandler(String(chatId), text);
          if (flowResult.nextState && flowResult.response) {
            consultationManager.updateSession(String(chatId), { flowState: flowResult.nextState });
            await this.bot.sendMessage(chatId, flowResult.response, { parse_mode: 'Markdown' });
          }
          return;
        }
        
        await this.handleAdmin(chatId, text, persona);
        return;
      }

      if (/^(status|9)$/i.test(text.trim())) {
        const roleLabel = this.getRoleLabel(persona.type);
        const selectedPersona = session?.selectedPersona || persona.type;
        await this.bot.sendMessage(chatId, `Your current role: *${roleLabel}*\n\n${InteractiveMenus.personaSelect(selectedPersona)}`, { parse_mode: 'Markdown' });
        return;
      }
      
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

        // Notify admins of new user registrations
        if (flowResult.nextState === FlowStates.DOCTOR_REGISTER && text?.match(/REGISTER_DOCTOR/i)) {
          await this.notifyAdminsDoctorRequest(String(chatId), text);
        }
        
        if (flowResult.nextState === FlowStates.CAREGIVER_AUTH) {
          await this.notifyAdminsCaregiverRequest(String(chatId));
        }

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
       } catch (error) {
         console.error('Message handler error:', error);
         await this.bot.sendMessage(chatId, 'An error occurred. Please try again.');
       }
     });

this.bot.on('photo', async (msg) => {
       try {
         const chatId = msg.chat.id;
         const photo = msg.photo[msg.photo.length - 1];
         const fileId = photo.file_id;
      
// Handle discount document upload for profile completion
      if (session?.profileStep === 'discount_documents') {
        const profile = session.patientProfile || {};
        profile.discountDocuments = profile.discountDocuments || [];
        profile.discountDocuments.push({
          id: `doc_${Date.now()}`,
          type: 'image',
          fileId: null, // Will be set after we get the actual file
          uploadedAt: new Date()
        });
        consultationManager.updateSession(String(chatId), { patientProfile: profile, profileStep: 'cancer_type', flowState: FlowStates.PROFILE });
        const categoryLabel = profile.discountCategory?.replace(/_/g, ' ') || 'selected';
        await this.bot.sendMessage(chatId,
          `✅ Discount document upload acknowledged for *${categoryLabel}*.` + `

Continue profile setup...` + InteractiveMenus.cancerTypes,
          { parse_mode: 'Markdown' }
        );
        
        // Notify admin for verification
        await this.notifyAdminsDiscountDocument(String(chatId), categoryLabel, fileId || 'uploaded');
        return;
      }

      const session = consultationManager.getSession(String(chatId));
      const reportType = session.reportUploadType || 'other';
      const mediaEntry = { type: 'image', fileId, reportType, receivedAt: new Date() };
      
      consultationManager.addMediaToConsultation(String(chatId), mediaEntry);

      // Forward to assigned doctor if exists
      const consultation = consultationManager.getConsultationByPatient(String(chatId));
      if (consultation?.doctorId) {
        const doctor = doctorPersistence.getDoctorById(consultation.doctorId);
        if (doctor?.telegramId) {
          await this.bot.sendPhoto(doctor.telegramId, fileId, {
            caption: `📎 *${REPORT_TYPE_LABELS[reportType] || reportType} report from patient*\nPatient Chat ID: ${chatId}`,
            parse_mode: 'Markdown'
          }).catch(() => {});
        }
      }

      // Notify admin on document upload
      await this.notifyAdminsDocumentUpload(String(chatId), reportType, 'photo');

      const pendingConsultation = consultationManager.getPendingConsultationByPatient(String(chatId));
      const typeLabel = REPORT_TYPE_LABELS[reportType] || reportType.replace('_', ' ');
      const consultationRef = pendingConsultation ? ` (Consultation: ${pendingConsultation.id})` : '';
await this.bot.sendMessage(
         chatId,
         `${typeLabel} report received${consultationRef}. Total docs: ${session.media.length}.`
       );
       } catch (error) {
         console.error('Photo handler error:', error);
         await this.bot.sendMessage(chatId, 'Error processing image. Please try again.');
       }
     });

this.bot.on('document', async (msg) => {
       try {
         const chatId = msg.chat.id;
         const document = msg.document;
         const fileId = document.file_id;
      
      const session = consultationManager.getSession(String(chatId));
      const reportType = session.reportUploadType || 'other';
      const mediaEntry = { type: 'document', fileId, reportType, receivedAt: new Date() };
      
      consultationManager.addMediaToConsultation(String(chatId), mediaEntry);

      // Forward to assigned doctor if exists
      const consultation = consultationManager.getConsultationByPatient(String(chatId));
      if (consultation?.doctorId) {
        const doctor = doctorPersistence.getDoctorById(consultation.doctorId);
        if (doctor?.telegramId) {
          await this.bot.sendDocument(doctor.telegramId, fileId, {
            caption: `📎 *${REPORT_TYPE_LABELS[reportType] || reportType} document from patient*\nPatient Chat ID: ${chatId}`,
            parse_mode: 'Markdown'
          }).catch(() => {});
        }
      }

      // Notify admin on document upload
      await this.notifyAdminsDocumentUpload(String(chatId), reportType, 'document');

      const pendingConsultation = consultationManager.getPendingConsultationByPatient(String(chatId));
      const typeLabel = REPORT_TYPE_LABELS[reportType] || reportType.replace('_', ' ');
      const consultationRef = pendingConsultation ? ` (Consultation: ${pendingConsultation.id})` : '';
await this.bot.sendMessage(
         chatId,
         `${typeLabel} document received${consultationRef}. Total docs: ${session.media.length}.`
       );
       } catch (error) {
         console.error('Document handler error:', error);
         await this.bot.sendMessage(chatId, 'Error processing document. Please try again.');
       }
     });
   }

  async handleDoctor(chatId, message) {
    const chatIdStr = String(chatId);
    const persona = new UserPersona(chatIdStr);
    const doctors = doctorPersistence.getDoctors();
    const doctor = doctors.find(
      d => d.telegramId === chatIdStr || String(d.phoneNumber).replace('+', '') === chatIdStr
    );

    if (!doctor) {
      const invited = doctorPersistence.getPendingDoctors().find(
        d => d.status === 'invited' && (d.telegramId === chatIdStr || d.phoneNumber === chatIdStr)
      );
      if (invited) {
        await this.bot.sendMessage(chatId, `📩 You have a pending invitation from admin!\n\nSend /accept to accept and activate your doctor account.`);
        return;
      }
      await this.bot.sendMessage(chatId, 'Unauthorized doctor. Admin must approve your registration.\nUse /register to apply or /accept if you were invited.');
      return;
    }

    // Admin communication
    const msgMatch = message.match(/^MSG_ADMIN\s+(.*)$/i);
    if (msgMatch) {
      const adminPhone = doctorPersistence.getAdminForDoctor(doctor.id);
      if (adminPhone) {
        await this.bot.sendMessage(adminPhone, 
          `📩 *Message from Dr. ${doctor.name}*:\n\n${msgMatch[1]}`,
          { parse_mode: 'Markdown' }
        );
        await this.bot.sendMessage(chatId, '✅ Message sent to your admin.');
      } else {
        await this.bot.sendMessage(chatId, '❌ No admin associated with your registration.');
      }
      return;
    }

    const consultation = Array.from(consultationManager.consultations.values())
      .find(c => c.doctorId === doctor.id && c.status === 'active');

    // Handle doctor closing consultation (either their own or by providing ID)
    const closeMatch = message.match(/^CLOSE\s+(\S+)$/i);
    if (closeMatch) {
      const consultationId = closeMatch[1];
      const targetConsultation = consultationManager.getConsultationById(consultationId);
      
      if (targetConsultation && (targetConsultation.doctorId === doctor.id || persona.isAdmin())) {
        const success = consultationManager.closeConsultation(consultationId, 'doctor');
        if (success) {
          await this.bot.sendMessage(chatId, `✅ Consultation ${consultationId} closed.`);
          await this.bot.sendMessage(targetConsultation.patientPhone, 
            `🔚 *Consultation Closed*\n\nYour consultation has been marked as complete.`, 
            { parse_mode: 'Markdown' }
          ).catch(() => {});
        } else {
          await this.bot.sendMessage(chatId, '❌ Cannot close this consultation.');
        }
      } else if (targetConsultation) {
        await this.bot.sendMessage(chatId, '❌ You can only close your own consultations.');
      } else {
        await this.bot.sendMessage(chatId, '❌ Consultation not found.');
      }
      return;
    }

    if (!consultation) {
      await this.bot.sendMessage(chatId, 'No active consultation. Wait for assignment.\nUse MSG_ADMIN <message> to contact your admin.');
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

    await this.bot.sendMessage(session.patientPhone, message, { parse_mode: 'Markdown' });
    consultationManager.addMessage(consultation.id, 'doctor', message);
    
    await this.bot.sendMessage(chatId, 'Message sent to patient/caregiver.');
  }

  async handleAdmin(chatId, message, persona) {
    const trimmed = message.trim();
    const isAdmin = persona.isAdmin();
    const isSuperAdmin = persona.type === PersonaTypes.SUPER_ADMIN;
    
    const addAdminMatch = trimmed.match(/^ADD_ADMIN\s+(\S+)(?:\s+(\S+))?(?:\s+(super_admin|admin))?$/i);
    if (addAdminMatch) {
      if (!isSuperAdmin) {
        await this.bot.sendMessage(chatId, '❌ Only Super Admin can add admins.');
        return;
      }
      const [, phoneOrTelegramId, telegramId, role] = addAdminMatch;
      const admin = require('../../services/adminRegistry').addAdmin(phoneOrTelegramId, String(chatId), telegramId || null, role || 'admin');
      await this.bot.sendMessage(chatId, `✅ Admin added: ${admin.id} (${admin.phoneNumber || admin.telegramId})`);
      return;
    }

    const removeAdminMatch = trimmed.match(/^REMOVE_ADMIN\s+(\S+)$/i);
    if (removeAdminMatch) {
      if (!isSuperAdmin) {
        await this.bot.sendMessage(chatId, '❌ Only Super Admin can remove admins.');
        return;
      }
      const [, phone] = removeAdminMatch;
      const removed = require('../../services/adminRegistry').removeAdmin(phone);
      await this.bot.sendMessage(chatId, removed ? `✅ Admin removed.` : `❌ Admin not found.`);
      return;
    }

    const approveRoleMatch = trimmed.match(/^APPROVE_ROLE\s+(\S+)\s+(\S+)$/i);
    if (approveRoleMatch) {
      if (!isSuperAdmin) {
        await this.bot.sendMessage(chatId, '❌ Only Super Admin can approve roles.');
        return;
      }
      const [, phoneOrChatId, role] = approveRoleMatch;
      const userRegistry = new (require('../../services/userRegistry'))();
      const user = userRegistry.getUser(phoneOrChatId) || userRegistry.getUserByPhone(phoneOrChatId);
      
      if (user && userRegistry.approveRole(user.chatId, role, String(chatId))) {
        await this.bot.sendMessage(chatId, `✅ Role ${role} approved for ${phoneOrChatId}`);
        // Notify the user
        await this.bot.sendMessage(user.chatId, `🎉 Your role application for ${role} has been approved!`).catch(() => {});
      } else {
        await this.bot.sendMessage(chatId, `❌ User not found or role invalid.`);
      }
      return;
    }

    const listRoleRequestsMatch = trimmed.match(/^LIST_ROLE_REQUESTS$/i);
    if (listRoleRequestsMatch) {
      if (!isSuperAdmin) {
        await this.bot.sendMessage(chatId, '❌ Only Super Admin can view role requests.');
        return;
      }
      const userRegistry = new (require('../../services/userRegistry'))();
      const requests = userRegistry.getPendingRequests();
      const list = requests.map(r => `${r.phoneNumber || r.chatId}: ${r.appliedRoles?.join(', ')} (profile: ${r.profile?.name || 'N/A'})`).join('\n') || 'No pending requests';
      await this.bot.sendMessage(chatId, `Pending Role Requests:\n${list}`);
      return;
    }

    const removeDoctorMatch = trimmed.match(/^REMOVE_DOCTOR\s+(\S+)$/i);
    if (removeDoctorMatch) {
      if (!isSuperAdmin) {
        await this.bot.sendMessage(chatId, '❌ Only Super Admin can remove doctors.');
        return;
      }
      const [, doctorId] = removeDoctorMatch;
      const removed = require('../../services/doctorPersistence').removeDoctor(doctorId);
      await this.bot.sendMessage(chatId, removed ? `✅ Doctor removed.` : `❌ Doctor not found.`);
      return;
    }

    const listAdminsMatch = trimmed.match(/^LIST_ADMINS$/i);
    if (listAdminsMatch) {
      const admins = require('../../services/adminRegistry').getAdmins();
      const adminList = admins.map(a => `${a.phoneNumber || a.telegramId}: ${a.role}`).join('\n') || 'No admins registered';
      await this.bot.sendMessage(chatId, `Admins:\n${adminList}`);
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
        `💳 *Choose Data Sharing Option*\n\nConsultation fee: ₹${baseAmount}\n\n1. Yes, allow research use → ${researchDiscount}% off → **₹${researchFinal}**\n2. Yes, allow commercial use → ${commercialDiscount}% off → **₹${commercialFinal}**\n3. No, do not allow → No discount → **₹${baseAmount}**\n\n0. Back to Menu\n\nReply with 1, 2, or 3`,
        { parse_mode: 'Markdown' }
      );
      await this.bot.sendMessage(chatId, `✅ Payment options sent to ${patientPhone}`);
      return;
    }
    
    const regDoctorMatch = trimmed.match(/^REGISTER\s+(\S+)\s+(\S+)\s+(\S+)\s+(.*)$/i);
    if (regDoctorMatch) {
      if (!isAdmin) {
        await this.bot.sendMessage(chatId, '❌ Only Admin can register doctors.');
        return;
      }
      const [, name, phone, specialty, cancerTypesStr] = regDoctorMatch;
      const cancerTypes = cancerTypesStr.split(',').map(c => c.trim()).filter(c => c);
      
      const doctor = doctorPersistence.addDoctor({
        id: `doc_${Date.now()}`,
        name,
        phoneNumber: phone,
        specialty,
        cancerTypes,
        consultationFee: 1500,
        approvedBy: String(chatId)
      });
      
      await this.bot.sendMessage(chatId, `✅ Doctor registered: ${doctor.id} (${doctor.name})\nAsk doctor to start bot with /start`);
      return;
    }

    const inviteDoctorMatch = trimmed.match(/^INVITE_DOCTOR\s+(\S+)\s+(\S+)\s+(\S+)\s+(.*)$/i);
    if (inviteDoctorMatch) {
      if (!isAdmin) {
        await this.bot.sendMessage(chatId, '❌ Only Admin can invite doctors.');
        return;
      }
      const [, name, phone, specialty, cancerTypesStr] = inviteDoctorMatch;
      const cancerTypes = cancerTypesStr.split(',').map(c => c.trim().toLowerCase()).filter(c => c);
      
      const invitation = doctorPersistence.createDoctorRequest({
        name,
        phoneNumber: phone,
        specialty,
        cancerTypes,
        consultationFee: 1500
      }, String(chatId));
      
      await this.bot.sendMessage(chatId, `✅ Doctor invited: ${invitation.id} (${name})\nThey must accept via /accept command.`);
      return;
    }

    const approveDoctorMatch = trimmed.match(/^APPROVE_DOCTOR\s+(\S+)$/i);
    if (approveDoctorMatch) {
      if (!isSuperAdmin) {
        await this.bot.sendMessage(chatId, '❌ Only Super Admin can approve doctors.');
        return;
      }
      const [, doctorId] = approveDoctorMatch;
      const approved = require('../../services/doctorPersistence').approveDoctor(doctorId, String(chatId));
      if (approved) {
        await this.bot.sendMessage(chatId, `✅ Doctor approved: ${approved.name} (${approved.id})`);
        if (approved.telegramId) {
          await this.bot.sendMessage(approved.telegramId, `✅ Your registration has been approved! You are now active. Send /start to begin.`);
        }
      } else {
        await this.bot.sendMessage(chatId, `❌ Doctor request not found.`);
      }
      return;
    }

    const messageDoctorMatch = trimmed.match(/^MSG_DOCTOR\s+(\S+)\s+(.*)$/i);
    if (messageDoctorMatch) {
      const [, doctorId, msgText] = messageDoctorMatch;
      const doctor = doctorPersistence.getDoctorById(doctorId);
      const adminPhone = String(chatId);
      
      if (!doctor) {
        await this.bot.sendMessage(chatId, `❌ Doctor not found.`);
        return;
      }
      
      if (doctor.approvedBy && doctor.approvedBy !== adminPhone && !isSuperAdmin) {
        await this.bot.sendMessage(chatId, `❌ You can only message doctors you approved.`);
        return;
      }
      
      if (doctor.telegramId) {
        await this.bot.sendMessage(doctor.telegramId, 
          `📩 *Message from Admin*:\n\n${msgText}`,
          { parse_mode: 'Markdown' }
        );
        await this.bot.sendMessage(chatId, `✅ Message sent to Dr. ${doctor.name}`);
      } else {
        await this.bot.sendMessage(chatId, `❌ Doctor has no Telegram ID registered.`);
      }
      return;
    }

    const rejectDoctorMatch = trimmed.match(/^REJECT_DOCTOR\s+(\S+)$/i);
    if (rejectDoctorMatch) {
      if (!isSuperAdmin) {
        await this.bot.sendMessage(chatId, '❌ Only Super Admin can reject doctors.');
        return;
      }
      const [, doctorId] = rejectDoctorMatch;
      doctorPersistence.rejectDoctor(doctorId);
      await this.bot.sendMessage(chatId, `❌ Doctor request rejected and removed.`);
      return;
    }

    const listPendingDoctorsMatch = trimmed.match(/^LIST_PENDING_DOCTORS$/i);
    if (listPendingDoctorsMatch) {
      const pending = doctorPersistence.getPendingDoctors();
      const list = pending.map(d => `${d.id}: ${d.name} - ${d.specialty} (${d.cancerTypes?.join(',') || 'none'})`).join('\n') || 'No pending requests';
      await this.bot.sendMessage(chatId, `Pending Doctor Requests:\n${list}`);
      return;
    }

    const listMyDoctorsMatch = trimmed.match(/^LIST_MY_DOCTORS$/i);
    if (listMyDoctorsMatch) {
      const myDoctors = doctorPersistence.getDoctorsByAdmin(String(chatId));
      const list = myDoctors.map(d => `${d.id}: ${d.name} - ${d.specialty}`).join('\n') || 'No doctors assigned';
      await this.bot.sendMessage(chatId, `Your Doctors:\n${list}`);
      return;
    }

    const listDoctorsMatch = trimmed.match(/^LIST_DOCTORS$/i);
    if (listDoctorsMatch) {
      const doctors = doctorPersistence.getDoctors();
      const list = doctors.map(d => `${d.id}: ${d.name} - ${d.specialty}`).join('\n') || 'No doctors registered';
      await this.bot.sendMessage(chatId, `Doctors:\n${list}`);
      return;
    }

    const msgPatientMatch = trimmed.match(/^MSG_PATIENT\s+(\S+)\s+(.*)$/i);
    if (msgPatientMatch) {
      const [, patientPhone, msgText] = msgPatientMatch;
      const consultation = consultationManager.getConsultationByPatient(patientPhone);
      
      if (!consultation) {
        await this.bot.sendMessage(chatId, `❌ Patient ${patientPhone} has no ongoing consultation.`);
        return;
      }
      
      if (consultation.adminAssigned && consultation.adminAssigned !== String(chatId) && !isSuperAdmin) {
        await this.bot.sendMessage(chatId, `❌ You can only message patients assigned to you.`);
        return;
      }

      await this.bot.sendMessage(patientPhone, 
        `📩 *Message from Admin*:\n\n${msgText}`,
        { parse_mode: 'Markdown' }
      );
      await this.bot.sendMessage(chatId, `✅ Message sent to patient ${patientPhone}`);
      return;
    }

    const closeMatch = trimmed.match(/^CLOSE\s+(\S+)$/i);
    if (closeMatch) {
      const consultationId = closeMatch[1];
      const consultation = consultationManager.getConsultationById(consultationId);
      
      if (!consultation) {
        await this.bot.sendMessage(chatId, '❌ Consultation not found.');
        return;
      }
      
      if (consultation.adminAssigned && consultation.adminAssigned !== String(chatId) && !isSuperAdmin) {
        await this.bot.sendMessage(chatId, '❌ You can only close consultations assigned to you.');
        return;
      }
      
      const success = consultationManager.closeConsultation(consultationId, 'admin');
      if (success) {
        await this.bot.sendMessage(chatId, `✅ Consultation ${consultationId} closed.`);
        await this.bot.sendMessage(consultation.patientPhone, 
          `🔚 *Consultation Closed*\n\nYour consultation has been marked as complete.`, 
          { parse_mode: 'Markdown' }
        ).catch(() => {});
      } else {
        await this.bot.sendMessage(chatId, '❌ Failed to close consultation.');
      }
      return;
    }

    await this.bot.sendMessage(chatId, 
      'Admin commands:\n1. Admin Menu\n2. LIST_DOCTORS\n3. LIST_MY_DOCTORS\n4. LIST_PENDING_DOCTORS\n5. REGISTER <name> <phone> <specialty> <cancers>\n6. INVITE_DOCTOR <name> <phone> <specialty> <cancers>\n7. REMOVE_DOCTOR <id>\n8. MSG_DOCTOR <id> <message>\n9. Status\n0. Switch Role\n\nCLOSE <consultation_id> to end consultation',
      { parse_mode: 'Markdown' }
    );
  }

  async notifyAdminsPaymentRequest(summary) {
    const admins = process.env.ADMIN_PHONES ? process.env.ADMIN_PHONES.split(',') : [];
    
    for (const admin of admins) {
      try {
        await this.bot.sendMessage(admin, 
          `📩 *New Payment Request*\n\nPatient: ${summary.phoneNumber}\nName: ${summary.name}\nCancer: ${summary.cancerType}\nDocs: ${summary.mediaCount}\n\nSet consultation fee using: /feebased PHONE AMOUNT [NOTE]\n\nExample: /feebased ${summary.phoneNumber} 2000 "complex case"`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        console.error(`Failed to notify admin ${admin}:`, error);
      }
    }
  }

  async routeQuery(chatId, message, session) {
    const intent = this.classifyIntent(message);
    
    // Handle MSG_ADMIN for patients to contact admin
    const msgAdminMatch = message.match(/^MSG_ADMINs+(.*)$/i);
    if (msgAdminMatch) {
      await this.notifyAdmin(chatId, `📩 *Patient Message*:\n\nPatient Chat ID: ${chatId}\n\n${msgAdminMatch[1]}`);
      return { message: `✅ Message sent to admin. They will respond shortly.` };
    }
    
    switch (intent) {
      case 'payment':
        const paymentInfo = await paymentService.generatePaymentLink(String(chatId), 0);
        consultationManager.updateSession(String(chatId), { paymentTransaction: paymentInfo.transactionId });
        return { message: `Please complete your consultation request first. Admin will determine and notify the fee.\n\nYour transaction: ${paymentInfo.transactionId}` };
        
      case 'oncology_query':
        const cancerType = this.extractCancerType(message);
        consultationManager.updateSession(String(chatId), { cancerType });
        return { message: `Detected: ${cancerType} cancer.\nComplete payment to connect with a specialist.` };
        
      case 'doctor_connect':
        return await this.handleConnectRequest(String(chatId), session);
        
      default:
        const sess = consultationManager.getSession(String(chatId));
        const currentPersona = sess?.selectedPersona || 'patient';
        return { message: InteractiveMenus.main(currentPersona) };
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
        `📩 New Consultation\nPatient Chat ID: ${chatId}\nDocs: ${connectedMedia.length}`
      ).catch(() => {});
    }
    
    return { message: `Connected to Dr. ${doctor.name}.\nConsultation fee: ₹${doctor.fee}` };
  }

  notifyDoctorOfNewConsultation(patientChatId, session, doctor) {
    if (!doctor.telegramId && !doctor.phoneNumber) return;
    const doctorTelegramId = doctor.telegramId || String(doctor.phoneNumber).replace('+', '');
    const pendingConsultation = consultationManager.getPendingConsultationByPatient(patientChatId);
    const connectedMedia = pendingConsultation?.rawQueryMedia || session.media || [];
    const isCaregiverNote = session.isCaregiver ? `\n\nNote: Caregiver session. Patient: ${session.patientName}` : '';
    return this.bot.sendMessage(doctorTelegramId, 
      `📩 New Consultation\nPatient Chat ID: ${patientChatId}\nDocs: ${connectedMedia.length}${isCaregiverNote}`
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
      await this.bot.sendMessage(userRegistry.getUserByPhone(phoneNumber)?.chatId || phoneNumber, message, { parse_mode: 'Markdown' });
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

  async notifyAdminsDoctorRequest(chatId, message) {
    const admins = process.env.ADMIN_PHONES ? process.env.ADMIN_PHONES.split(',') : [];
    const match = message.match(/REGISTER_DOCTOR\s+"?([^"]+)"?\s+"?([^"]*)"?\s+(.*)$/i);
    
    for (const admin of admins) {
      try {
        await this.bot.sendMessage(admin,
          `👨‍⚕️ *New Doctor Registration Request*\n\nChat ID: ${chatId}\n${match ? `Name: ${match[1]}\nSpecialty: ${match[2]}\nCancer Types: ${match[3]}` : 'Details pending submission'}\n\nAwaiting admin approval.`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        console.error(`Failed to notify admin ${admin}:`, error);
      }
    }
  }

  async notifyAdminsCaregiverRequest(chatId) {
    const admins = process.env.ADMIN_PHONES ? process.env.ADMIN_PHONES.split(',') : [];
    
    for (const admin of admins) {
      try {
        await this.bot.sendMessage(admin,
          `👤 *New Caregiver Registration*\n\nUser Chat ID: ${chatId}\nAwaiting caregiver info and approval.`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        console.error(`Failed to notify admin ${admin}:`, error);
      }
    }
  }

  async notifyAdminsDiscountDocument(chatId, categoryLabel, fileId) {
    const admins = process.env.ADMIN_PHONES ? process.env.ADMIN_PHONES.split(',') : [];
    for (const admin of admins) {
      try {
        await this.bot.sendMessage(admin,
          `🏛️ *Discount Document Uploaded*

Patient: ${chatId}
Category: ${categoryLabel}
Document: ${fileId || 'view in session'}

Review and verify in admin panel.`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        console.error(`Failed to notify admin ${admin}:`, error);
      }
    }
  }

  async notifyAdminsDocumentUpload(chatId, reportType, mediaType) {
    const admins = process.env.ADMIN_PHONES ? process.env.ADMIN_PHONES.split(',') : [];
    const session = consultationManager.getSession(String(chatId));
    const pendingConsultation = consultationManager.getPendingConsultationByPatient(String(chatId));
    const typeLabel = REPORT_TYPE_LABELS[reportType] || reportType.replace('_', ' ');
    
    for (const admin of admins) {
      try {
        await this.bot.sendMessage(admin,
          `📎 *Document Uploaded*\n\nPatient: ${chatId}\nType: ${typeLabel} (${mediaType})\nTotal Docs: ${session.media.length}\nConsultation: ${pendingConsultation?.id || 'pending payment'}`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        console.error(`Failed to notify admin ${admin}:`, error);
      }
    }
  }
}

module.exports = TelegramAdapter;