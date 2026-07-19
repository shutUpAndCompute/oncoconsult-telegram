const TelegramBot = require('node-telegram-bot-api');
const { ConversationFlow, InteractiveMenus, FlowStates } = require('../../services/conversationFlow');
const { UserPersona, PersonaTypes, SUPER_ADMIN_CHAT_IDS, SUPER_ADMIN_PHONES } = require('../../models/persona');
const { normalizePhone } = require('../../utils/phone');
const ConsultationManager = require('../../services/consultationManager');
const DoctorRouter = require('../../services/doctorRouter');
const PaymentService = require('../../services/paymentService');
const MasterDataManager = require('../../services/masterDataManager');
const DoctorPersistence = require('../../services/doctorPersistence');
const { getAdminWelcome } = require('../../services/authGuard');
const UserRegistry = require('../../services/userRegistry');
const adminRegistry = require('../../services/adminRegistry');

function ensureEnvSeededAdminRecord(chatId) {
  const adminRecord = adminRegistry.getAdmin(String(chatId));
  if (adminRecord) return adminRecord;
  
  const normalized = normalizePhone(String(chatId));
  const isSuperAdminChat = SUPER_ADMIN_CHAT_IDS.includes(String(chatId));
  const isSuperAdminPhone = SUPER_ADMIN_PHONES.includes(String(chatId)) || SUPER_ADMIN_PHONES.includes(normalized);
  const isAdminPhone = process.env.ADMIN_PHONES?.split(',')?.map(p => p.trim().replace('+', '')).includes(String(chatId)) ||
                       process.env.ADMIN_PHONES?.split(',')?.map(p => p.trim().replace('+', '')).includes(normalized);
  
  if (isSuperAdminChat || isSuperAdminPhone) {
    const role = 'super_admin';
    return adminRegistry.addAdmin(String(chatId), String(chatId), String(chatId), role, null);
  }
  
  if (isAdminPhone) {
    return adminRegistry.addAdmin(String(chatId), String(chatId), String(chatId), 'admin', null);
  }
  
  return null;
}

const doctorRouter = new DoctorRouter();
const consultationManager = new ConsultationManager(doctorRouter);
const paymentService = new PaymentService();
const masterData = new MasterDataManager();
const doctorPersistence = new DoctorPersistence();
const userRegistry = new UserRegistry();
const conversationFlow = new ConversationFlow(consultationManager, doctorRouter, paymentService, userRegistry, adminRegistry);

const REPORT_TYPE_LABELS = {
  pathology: "Pathology",
  radiology: "Radiology",
  lab_results: "Lab Results",
  prescription: "Prescription",
  discharge_summary: "Discharge Summary",
  biopsy: "Biopsy",
  surgical: "Surgical"
};

// States that belong to the Admin/Super Admin domain (reachable only by
// navigating admin menus). If an admin's session.flowState ever drifts
// outside this set (e.g. the WELCOME default before their first /start,
// or a stale patient-flow state), they must be routed back to ADMIN_MENU
// instead of silently falling through to the patient conversation flow.
const ADMIN_DOMAIN_STATES = new Set([
  FlowStates.ADMIN_MENU,
  FlowStates.SUPER_ADMIN_MENU,
  FlowStates.ADMIN_ROLE_APPROVALS,
  FlowStates.ADMIN_DOCTOR_MANAGEMENT,
  FlowStates.ADMIN_ASSIGN_DOCTOR_INPUT,
  FlowStates.ADMIN_REMOVE_DOCTOR_INPUT,
  FlowStates.ADMIN_REJECT_DOCTOR_INPUT,
  FlowStates.ADMIN_REASSIGN_DOCTOR_INPUT,
  FlowStates.ADMIN_MESSAGE_DOCTOR_INPUT,
  FlowStates.ADMIN_MESSAGE_PATIENT_INPUT,
  FlowStates.ADMIN_VERIFY_PAYMENT_INPUT,
  FlowStates.ADMIN_VERIFY_DISCOUNT_INPUT,
  FlowStates.ADMIN_INVITE_DOCTOR_INPUT,
  FlowStates.ADMIN_REGISTER_DOCTOR_INPUT,
  FlowStates.ADMIN_APPROVE_DOCTOR_INPUT,
  FlowStates.ADMIN_APPROVE_CAREGIVER_INPUT,
  FlowStates.ADMIN_APPROVE_SUPPORT_INPUT,
  FlowStates.ADMIN_CLOSE_CONSULTATION,
   FlowStates.ADMIN_ADD_ADMIN_INPUT,
   FlowStates.ADMIN_REMOVE_ADMIN_INPUT,
   FlowStates.ADMIN_SET_FEE_INPUT,
   FlowStates.ADMIN_PROFILE_EDIT
]);

// Same idea for Support: SUPPORT_MENU plus the sub-states its own menu
// options route into (Message Doctor / Message Patient).
const SUPPORT_DOMAIN_STATES = new Set([
  FlowStates.SUPPORT_MENU,
  FlowStates.ADMIN_MESSAGE_DOCTOR_INPUT,
  FlowStates.ADMIN_MESSAGE_PATIENT_INPUT
]);

// DOCTOR_MENU plus the sub-states its own menu options route into (Edit
// Profile, Message Admin).
const DOCTOR_DOMAIN_STATES = new Set([
  FlowStates.DOCTOR_MENU,
  FlowStates.DOCTOR_PROFILE_EDIT,
  FlowStates.DOCTOR_MSG_ADMIN_INPUT
]);

// Cross-role states reachable from any persona's own menu (profile viewing/
// editing, applying for a new role, switching role) - never something to
// self-heal away from regardless of the current effective role.
const SHARED_DOMAIN_STATES = new Set([
  FlowStates.PROFILE_VIEW,
  FlowStates.PROFILE_EDIT,
  FlowStates.PROFILE_REMOVE_ROLE,
  FlowStates.ROLE_APPLICATION,
  FlowStates.PERSONA_SELECT
]);

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
      [PersonaTypes.SUPPORT]: 'Support',
      [PersonaTypes.PATIENT]: 'Patient'
    };
    return labels[type] || 'Unknown';
  }

  // A user's live-detected role (persona.type) is the precedence winner among
  // everything they qualify for. If they've explicitly switched to a
  // different role they're also authorized for (session.selectedPersona,
  // validated against persona.availableRoles so this can never grant
  // anything identifyPersona() wouldn't), honor that choice instead so
  // Switch Role actually sticks across messages and /start calls.
  getEffectiveRole(persona, session) {
    const selected = session?.selectedPersona;
    // selectedPersona is null until the user explicitly switches role (see
    // ConsultationManager.getSession/resetSession) - it must never default
    // to 'patient', or every non-patient role (admin, doctor, support) would
    // be silently downgraded to Patient Mode on their very first message,
    // before they've ever touched Switch Role.
    if (selected && persona.availableRoles?.includes(selected)) {
      return selected;
    }
    return persona.type;
  }

  // Shared by the photo/document handlers. Files were previously accepted
  // from any sender and unconditionally filed as a patient's own medical
  // report, regardless of who actually sent them. Returns true if this
  // upload was fully handled here (caller should return without falling
  // through to the default patient-report-upload path).
  async handleIncomingMedia(chatId, session, effectiveRole, { kind, fileId, send }) {
    if (effectiveRole === PersonaTypes.DOCTOR) {
      const doctors = doctorPersistence.getDoctors();
      const doctor = doctors.find(d => d.telegramId === String(chatId) ||
        String(d.phoneNumber).replace('+', '') === String(chatId));
      const consultation = doctor && Array.from(consultationManager.consultations.values())
        .find(c => c.doctorId === doctor.id && c.status === 'active');
      if (consultation) {
        await send(consultation.patientPhone, {
          caption: `📎 ${kind === 'photo' ? 'Photo' : 'Document'} from Dr. ${doctor.name}`,
          parse_mode: 'Markdown'
        }).catch(() => {});
        consultationManager.addMessage(consultation.id, 'doctor', `[${kind}]`);
        await this.bot.sendMessage(chatId, '✅ Sent to patient.');
      } else {
        await this.bot.sendMessage(chatId, 'No active consultation to send this to.');
      }
      return true;
    }

    if (effectiveRole === PersonaTypes.ADMIN || effectiveRole === PersonaTypes.SUPER_ADMIN || effectiveRole === PersonaTypes.SUPPORT) {
      await this.bot.sendMessage(chatId, `Files aren't used here. Use MSG_PATIENT <phone> <message> or MSG_DOCTOR <id> <message> to relay information instead.`);
      return true;
    }

    // Discount-eligibility document upload (opt-in flow reached from Billing).
    // Eligibility describes the PATIENT being treated, not whoever uploads
    // it - a caregiver acting for a linked patient must attach this to the
    // patient's own profile, or admin verification would be checking (and
    // the discount would apply to) the wrong person entirely.
    if (session?.flowState === FlowStates.PROFILE_DISCOUNT_DOCUMENTS) {
      const targetPhone = (session?.isCaregiver && session?.linkedPatientPhone) ? session.linkedPatientPhone : String(chatId);
      const profile = consultationManager.getSession(targetPhone)?.patientProfile || {};
      profile.discountDocuments = profile.discountDocuments || [];
      profile.discountDocuments.push({ id: `doc_${Date.now()}`, type: kind, fileId, uploadedAt: new Date() });
      consultationManager.updateSession(targetPhone, { patientProfile: profile });
      consultationManager.updateSession(String(chatId), { flowState: FlowStates.BILLING });
      const categoryLabel = profile.discountCategory?.replace(/_/g, ' ') || 'selected';
      await this.bot.sendMessage(chatId,
        `✅ Discount document received for *${categoryLabel}*. Admin will review it.\n\n${InteractiveMenus.billing}`,
        { parse_mode: 'Markdown' }
      );
      await this.notifyAdminsDiscountDocument(targetPhone, categoryLabel, fileId);
      return true;
    }

    return false;
  }

  async initialize(token) {
    this.bot = new TelegramBot(token, {
      polling: false,
      request: {
        // No keepAlive: long-polling holds each getUpdates request open for
        // up to 30s, then fires the next one immediately. A reused
        // keep-alive socket that's gone idle across that gap is prone to
        // being silently closed by intermediate network hops, surfacing as
        // EFATAL/ECONNRESET on the next poll. A fresh connection per poll
        // avoids that class of error entirely.
        agentOptions: { keepAlive: false }
      }
    });

    // Every outgoing message is built by interpolating user-supplied text
    // (patient/doctor/caregiver names, hospital names, admin-typed notes,
    // relayed messages) into parse_mode: 'Markdown' strings, unescaped.
    // Telegram's legacy Markdown parser treats *, _, ` and [ as formatting
    // control characters - if any of that free text happens to contain one
    // (or an unlucky multi-codepoint emoji sequence, as previously seen
    // with the ZWJ doctor/stethoscope emoji), the send fails outright with
    // "can't parse entities", regardless of which role or menu triggered
    // it. Escaping every interpolation site individually is error-prone
    // and easy to miss one, so instead: wrap sendMessage/sendPhoto/
    // sendDocument (captions use the same parse_mode/entity parsing) to
    // retry once in plain text on that specific failure, so a malformed
    // name or emoji degrades to unformatted text instead of silently
    // failing to send. This matters even more for sendPhoto/sendDocument,
    // since several of their call sites (e.g. forwarding a doctor's photo
    // to a patient) swallow errors with .catch(() => {}) - without this,
    // a bad doctor name would silently drop the file with no error
    // surfaced to anyone.
    const wrapEntityRetry = (methodName) => {
      const raw = this.bot[methodName].bind(this.bot);
      this.bot[methodName] = async (chatId, contentOrFileId, options = {}) => {
        try {
          return await raw(chatId, contentOrFileId, options);
        } catch (err) {
          const description = err?.response?.body?.description || err.message || '';
          if (options.parse_mode && /can't parse entities/i.test(description)) {
            console.warn(`[${methodName}] Markdown parse failed for chat ${chatId}, retrying as plain text: ${description}`);
            const { parse_mode, ...plainOptions } = options;
            return raw(chatId, contentOrFileId, plainOptions);
          }
          throw err;
        }
      };
    };
    wrapEntityRetry('sendMessage');
    wrapEntityRetry('sendPhoto');
    wrapEntityRetry('sendDocument');

    let consecutiveFatal = 0;
    this.bot.on('polling_error', (err) => {
      const msg = err?.response?.body?.description || err.message || String(err);
      if (err.code === 'EFATAL') {
        consecutiveFatal++;
        console.warn(`[polling_error]: EFATAL (${consecutiveFatal}x): ${msg.substring(0, 100)}`);
        if (consecutiveFatal >= 5) {
          consecutiveFatal = 0;
          console.warn('[polling_error]: Restarting polling after repeated EFATAL');
          this.bot.stopPolling()
            .then(() => setTimeout(() => this.bot.startPolling({ params: { timeout: 30 } }), 3000))
            .catch((e) => console.error('[polling_error]: Failed to restart polling:', e.message));
        }
        return;
      }
      consecutiveFatal = 0;
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
      const session = consultationManager.getSession(String(chatId));
      const effectiveRole = this.getEffectiveRole(persona, session);
      const roleLabel = this.getRoleLabel(effectiveRole);

      // Check if mobile number is needed for new users (based on true admin
      // status, not the currently-selected role, so switching away from
      // Admin Mode never re-triggers onboarding for an existing admin)
      if (!session.phoneNumber && !session.mobileSkipped && !persona.isAdmin()) {
        consultationManager.updateSession(String(chatId), { flowState: FlowStates.MOBILE_COLLECTION });
        await this.bot.sendMessage(chatId, InteractiveMenus.mobileCollection, { parse_mode: 'Markdown' });
        return;
      }

      // Route by the effective role (selectedPersona if validly authorized,
      // otherwise the live precedence winner) so Switch Role actually sticks.
      if (effectiveRole === PersonaTypes.ADMIN || effectiveRole === PersonaTypes.SUPER_ADMIN) {
        const isSuperAdmin = effectiveRole === PersonaTypes.SUPER_ADMIN;
        const adminMenuState = isSuperAdmin ? FlowStates.SUPER_ADMIN_MENU : FlowStates.ADMIN_MENU;
        const inAdminFlow = session?.flowState === adminMenuState;
        if (!inAdminFlow) {
          consultationManager.updateSession(String(chatId), { flowState: adminMenuState });
        }
        ensureEnvSeededAdminRecord(String(chatId));
        const adminProfileComplete = adminRegistry.isAdminProfileComplete(String(chatId));
        const pendingCount = consultationManager.getPendingForAdmin().length;
        const activeCount = Array.from(consultationManager.consultations.values())
          .filter(c => c.status === 'active').length;
const adminMenu = isSuperAdmin 
          ? InteractiveMenus.superAdminMenu(pendingCount, activeCount)
          : InteractiveMenus.adminMenu;
        const missingFields = adminRegistry.getIncompleteProfileFields(String(chatId));
        await this.bot.sendMessage(chatId, `${adminProfileComplete ? adminMenu : InteractiveMenus.adminMenuIncomplete(isSuperAdmin, missingFields)}\n\nPending: ${pendingCount} | Active: ${activeCount}`, { parse_mode: 'Markdown' });
      } else if (effectiveRole === PersonaTypes.SUPPORT) {
        if (flowState !== FlowStates.SUPPORT_MENU) {
          consultationManager.updateSession(String(chatId), { flowState: FlowStates.SUPPORT_MENU });
        }
        await this.bot.sendMessage(chatId, InteractiveMenus.supportMenu, { parse_mode: 'Markdown' });
      } else if (effectiveRole === PersonaTypes.DOCTOR) {
        const doctors = doctorPersistence.getDoctors();
        const doctor = doctors.find(d => d.telegramId === String(chatId) ||
          String(d.phoneNumber).replace('+', '') === String(chatId));
        const hasActive = !!Array.from(consultationManager.consultations.values())
          .find(c => c.doctorId === doctor?.id && c.status === 'active');
        const pendingActions = consultationManager.getPendingActionsForDoctor(doctor?.id) || 0;
        if (flowState !== FlowStates.DOCTOR_MENU) {
          consultationManager.updateSession(String(chatId), { flowState: FlowStates.DOCTOR_MENU });
        }
        await this.bot.sendMessage(chatId, InteractiveMenus.doctorMenu(doctor?.name || 'Doctor', hasActive, pendingActions), { parse_mode: 'Markdown' });
      } else if (flowState === FlowStates.CAREGIVER_MENU) {
        await this.bot.sendMessage(chatId, InteractiveMenus.caregiverMenu(session?.patientName), { parse_mode: 'Markdown' });
      } else {
        await this.bot.sendMessage(chatId, conversationFlow.getWelcomeMenu(String(chatId)), { parse_mode: 'Markdown' });
      }
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
        await this.bot.sendMessage(chatId, `📋 *Session Resumed*\n\nProfile: ${session.patientProfile.name || 'set'}\nDocs: ${session.media?.length || 0}\n\n${conversationFlow.getWelcomeMenu(chatId)}`, { parse_mode: 'Markdown' });
      } else {
        await this.bot.sendMessage(chatId, `No previous session found. Use /start to begin.`);
      }
    });

    this.bot.onText(/\/profile/, async (msg) => {
      const chatId = String(msg.chat.id);
      const session = consultationManager.getSession(chatId);
      const persona = new UserPersona(chatId);
      const effectiveRole = this.getEffectiveRole(persona, session);
      
      // Admin/Super Admin profile view
      if (effectiveRole === PersonaTypes.ADMIN || effectiveRole === PersonaTypes.SUPER_ADMIN) {
        const admin = adminRegistry.getAdmin(chatId);
        if (admin) {
          await this.bot.sendMessage(chatId, InteractiveMenus.adminProfileView(admin), { parse_mode: 'Markdown' });
        } else {
          await this.bot.sendMessage(chatId, `❌ Admin profile not found. Contact super admin.`);
        }
        return;
      }
      
      const profile = session?.patientProfile || {};
      const isCaregiver = session?.isCaregiver || false;
      
      const profileText = `📋 *Your Profile*\n\n*Name:* ${profile.name || 'Not set'}\n*Age:* ${profile.age || 'Not set'}\n*Gender:* ${profile.gender || 'Not set'}\n*Address:* ${profile.address || 'Not set'}\n*State:* ${profile.state || 'Not set'}\n*Cancer Type:* ${profile.cancerType || 'Not set'}\n*Treating Hospital:* ${profile.treatingHospital || 'Not set'}\n*Treatment Status:* ${profile.treatmentStatus || 'Not set'}\n*Medical Reports:* ${profile.medicalReports?.length || 0} uploaded\n*Emergency Contact:* ${profile.emergencyContactName || 'Not set'} (${profile.emergencyContactRelation || 'Not set'})\n*Discount Category:* ${profile.discountCategory || 'none'}\n*Discount Status:* ${profile.discountVerificationStatus || 'not_applied'}\n${isCaregiver && profile.caregiverName ? `\n*Caregiver Name:* ${profile.caregiverName}` : ''}\n${isCaregiver && profile.patientName ? `*Patient Name:* ${profile.patientName}` : ''}\n${isCaregiver && profile.caregiverRelationship ? `*Relationship:* ${profile.caregiverRelationship}` : ''}`;
      
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
        ).catch(e => console.error(`[NOTIFY-FAIL]`, e));
        
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
      const effectiveRole = this.getEffectiveRole(persona, session);

      // Route by effective role first so an admin/support user mid-substate
      // (e.g. ADMIN_ROLE_APPROVALS) still lands on their own domain's menu
      // instead of falling into the patient main menu default below.
      if (effectiveRole === PersonaTypes.ADMIN || effectiveRole === PersonaTypes.SUPER_ADMIN) {
        const isSuperAdmin = effectiveRole === PersonaTypes.SUPER_ADMIN;
        const adminMenuState = isSuperAdmin ? FlowStates.SUPER_ADMIN_MENU : FlowStates.ADMIN_MENU;
        if (flowState !== adminMenuState) {
          consultationManager.updateSession(String(chatId), { flowState: adminMenuState });
        }
        ensureEnvSeededAdminRecord(String(chatId));
        const adminProfileComplete = adminRegistry.isAdminProfileComplete(String(chatId));
        const pendingCount = consultationManager.getPendingForAdmin().length;
        const activeCount = Array.from(consultationManager.consultations.values())
          .filter(c => c.status === 'active').length;
        const adminMenu = isSuperAdmin 
          ? InteractiveMenus.superAdminMenu(pendingCount, activeCount)
          : InteractiveMenus.adminMenu;
        const missingFields = adminRegistry.getIncompleteProfileFields(String(chatId));
        await this.bot.sendMessage(chatId, `${adminProfileComplete ? adminMenu : InteractiveMenus.adminMenuIncomplete(isSuperAdmin, missingFields)}\n\nPending: ${pendingCount} | Active: ${activeCount}`, { parse_mode: 'Markdown' });
      } else if (effectiveRole === PersonaTypes.SUPPORT) {
        if (flowState !== FlowStates.SUPPORT_MENU) {
          consultationManager.updateSession(String(chatId), { flowState: FlowStates.SUPPORT_MENU });
        }
        await this.bot.sendMessage(chatId, InteractiveMenus.supportMenu, { parse_mode: 'Markdown' });
      } else if (effectiveRole === PersonaTypes.DOCTOR) {
        const doctors = doctorPersistence.getDoctors();
        const doctor = doctors.find(d => d.telegramId === String(chatId) ||
          String(d.phoneNumber).replace('+', '') === String(chatId));
        const hasActive = !!Array.from(consultationManager.consultations.values())
          .find(c => c.doctorId === doctor?.id && c.status === 'active');
        const pendingActions = consultationManager.getPendingActionsForDoctor(doctor?.id) || 0;
        if (flowState !== FlowStates.DOCTOR_MENU) {
          consultationManager.updateSession(String(chatId), { flowState: FlowStates.DOCTOR_MENU });
        }
        await this.bot.sendMessage(chatId, InteractiveMenus.doctorMenu(doctor?.name || 'Doctor', hasActive, pendingActions), { parse_mode: 'Markdown' });
      } else if (flowState === FlowStates.CAREGIVER_MENU) {
        await this.bot.sendMessage(chatId, InteractiveMenus.caregiverMenu(session?.patientName), { parse_mode: 'Markdown' });
      } else {
        await this.bot.sendMessage(chatId, conversationFlow.getWelcomeMenu(String(chatId)), { parse_mode: 'Markdown' });
      }
    });

    this.bot.on('message', async (msg) => {
       const chatId = msg.chat.id;
       try {
         const text = msg.text || '';

         if (text.startsWith('/')) return;

         const persona = new UserPersona(String(chatId));
         const session = consultationManager.getSession(String(chatId));
         const effectiveRole = this.getEffectiveRole(persona, session);
         const inPersonaSelect = session?.flowState === FlowStates.PERSONA_SELECT;

         // Doctors get intercepted here for MSG_ADMIN/CLOSE/reply-to-patient -
         // except while they're actually sitting in their own menu domain
         // (DOCTOR_MENU, its own Edit Profile / Message Admin sub-states, or
         // the shared Profile/Role-application screens) or picking a new
         // role, where plain text is a menu selection instead, not a
         // message to forward. Previously this only excluded DOCTOR_MENU
         // itself, so a doctor who navigated to Profile had their next
         // reply swallowed by the MSG_ADMIN/CLOSE/forwarding logic instead
         // of being processed as a menu selection.
         const inDoctorDomain = DOCTOR_DOMAIN_STATES.has(session?.flowState) || SHARED_DOMAIN_STATES.has(session?.flowState);
         if (effectiveRole === PersonaTypes.DOCTOR && !inPersonaSelect && !inDoctorDomain) {
           await this.handleDoctor(chatId, text);
           return;
         }
         if (effectiveRole === PersonaTypes.DOCTOR && session?.flowState === FlowStates.DOCTOR_MENU) {
           const flowResult = conversationFlow.handleDoctorMenuSelection(text, String(chatId), session);
           if (flowResult.nextState) {
             consultationManager.updateSession(String(chatId), { flowState: flowResult.nextState });
           }
           await this.bot.sendMessage(chatId, flowResult.response, { parse_mode: 'Markdown' });
           return;
         }
         // Other doctor-domain shared states (PROFILE_VIEW, PROFILE_EDIT,
         // etc.) fall through to createFlowHandler below, whose
         // state-driven dispatch routes them correctly.

if (!inPersonaSelect && (effectiveRole === PersonaTypes.ADMIN || effectiveRole === PersonaTypes.SUPER_ADMIN)) {
             const currentFlowState = session?.flowState;
             const inAdminDomain = ADMIN_DOMAIN_STATES.has(currentFlowState) || SHARED_DOMAIN_STATES.has(currentFlowState);

             if (!inAdminDomain) {
               const isSuperAdmin = effectiveRole === PersonaTypes.SUPER_ADMIN;
               const adminMenuState = isSuperAdmin ? FlowStates.SUPER_ADMIN_MENU : FlowStates.ADMIN_MENU;
               consultationManager.updateSession(String(chatId), { flowState: adminMenuState });
               const menu = isSuperAdmin ? InteractiveMenus.superAdminMenu() : InteractiveMenus.adminMenu;
               await this.bot.sendMessage(chatId, menu, { parse_mode: 'Markdown' });
               return;
             }

             if (currentFlowState === FlowStates.SUPER_ADMIN_MENU) {
               const flowResult = conversationFlow.handleSuperAdminMenuSelection(text, String(chatId), session);
               if (flowResult.nextState) {
                 consultationManager.updateSession(String(chatId), { flowState: flowResult.nextState });
               }
               await this.bot.sendMessage(chatId, flowResult.response, { parse_mode: 'Markdown' });
               return;
             }
             if (currentFlowState === FlowStates.ADMIN_MENU) {
               const flowResult = conversationFlow.handleAdminMenuSelection(text, String(chatId));
               if (flowResult.nextState) {
                 consultationManager.updateSession(String(chatId), { flowState: flowResult.nextState });
               }
               await this.bot.sendMessage(chatId, flowResult.response, { parse_mode: 'Markdown' });
               return;
             }
             // Other admin-domain sub-states (ADMIN_ROLE_APPROVALS,
             // ADMIN_*_INPUT, shared profile/persona states) fall through to
             // createFlowHandler below, whose state-driven dispatch already
             // routes them to the correct handler.
           }

          if (!inPersonaSelect && effectiveRole === PersonaTypes.SUPPORT) {
            const currentFlowState = session?.flowState;
            const inSupportDomain = SUPPORT_DOMAIN_STATES.has(currentFlowState) || SHARED_DOMAIN_STATES.has(currentFlowState);

            if (!inSupportDomain) {
              consultationManager.updateSession(String(chatId), { flowState: FlowStates.SUPPORT_MENU });
              await this.bot.sendMessage(chatId, InteractiveMenus.supportMenu, { parse_mode: 'Markdown' });
              return;
            }

            if (currentFlowState === FlowStates.SUPPORT_MENU) {
              const flowResult = conversationFlow.handleSupportMenuSelection(text, String(chatId));
              if (flowResult.nextState) {
                consultationManager.updateSession(String(chatId), { flowState: flowResult.nextState });
              }
              await this.bot.sendMessage(chatId, flowResult.response, { parse_mode: 'Markdown' });
              return;
            }
          }

          if (inPersonaSelect || session?.flowState === FlowStates.WELCOME) {
            const flowResult = await conversationFlow.createFlowHandler(String(chatId), text);
            if (flowResult.nextState && flowResult.response) {
              consultationManager.updateSession(String(chatId), { flowState: flowResult.nextState });
              await this.bot.sendMessage(chatId, flowResult.response, { parse_mode: 'Markdown' });
            }
            return;
          }

          // Handle doctor message admin input - send to admin
          if (session?.flowState === FlowStates.DOCTOR_MSG_ADMIN_INPUT && effectiveRole === PersonaTypes.DOCTOR) {
            const doctor = doctorPersistence.getDoctors().find(d => d.telegramId === String(chatId));
            const adminPhone = doctorPersistence.getAdminForDoctor(doctor.id);
            if (adminPhone) {
              await this.bot.sendMessage(adminPhone, `📩 *Message from Dr. ${doctor.name}*:\n\n${text}`, { parse_mode: 'Markdown' });
              consultationManager.updateSession(String(chatId), { flowState: FlowStates.DOCTOR_MENU });
              await this.bot.sendMessage(chatId, `✅ Message sent to admin.\n\n${InteractiveMenus.doctorMenu(doctor.name, false)}`, { parse_mode: 'Markdown' });
            } else {
              consultationManager.updateSession(String(chatId), { flowState: FlowStates.DOCTOR_MENU });
              await this.bot.sendMessage(chatId, `❌ No admin associated with your registration.\n\n${InteractiveMenus.doctorMenu(doctor?.name || 'Doctor', false)}`, { parse_mode: 'Markdown' });
            }
            return;
          }

      if (/^(status|9)$/i.test(text.trim())) {
        const roleLabel = this.getRoleLabel(effectiveRole);
        await this.bot.sendMessage(chatId, `Your current role: *${roleLabel}*\n\n${InteractiveMenus.personaSelect(effectiveRole, persona.availableRoles)}`, { parse_mode: 'Markdown' });
        return;
      }
      
      const idleResult = conversationFlow.checkIdle(String(chatId));
      if (idleResult) {
        await this.notifyAdminsAbandonment(String(chatId), session, 'idle');
        await this.bot.sendMessage(chatId, idleResult.response, { parse_mode: 'Markdown' });
        return;
      }

      const flowResult = await conversationFlow.createFlowHandler(String(chatId), text);

      if (flowResult.nextState && flowResult.response) {
        consultationManager.updateSession(String(chatId), { flowState: flowResult.nextState });
        await this.bot.sendMessage(chatId, flowResult.response, { parse_mode: 'Markdown' });

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

        if (flowResult.data?.doctorMsgToAdmin) {
          const { adminPhone, doctorName, message: msgText } = flowResult.data.doctorMsgToAdmin;
          await this.bot.sendMessage(adminPhone,
            `📩 *Message from Dr. ${doctorName}*:\n\n${msgText}`,
            { parse_mode: 'Markdown' }
          ).catch(() => {});
        }

        // Menu-driven admin -> patient message (handleAdminMessagePatientInput).
        // The handler previously only told the admin to run a raw MSG_PATIENT
        // command that nothing ever parsed - the message was never actually
        // delivered. Deliver it here, matching the doctorMsgToAdmin pattern.
        if (flowResult.data?.adminMsgToPatient) {
          const { patientPhone, message: msgText } = flowResult.data.adminMsgToPatient;
          await this.bot.sendMessage(patientPhone,
            `📩 *Message from Admin*\n\n${msgText}`,
            { parse_mode: 'Markdown' }
          ).catch(() => {});
        }

        // Menu-driven admin -> doctor message (handleAdminMessageDoctorInput).
        // Same dead-end as adminMsgToPatient above, pointed at a nonexistent
        // MSG_DOCTOR raw command instead.
        if (flowResult.data?.adminMsgToDoctor) {
          const { doctorId, message: msgText } = flowResult.data.adminMsgToDoctor;
          const doctor = doctorPersistence.getDoctorById(doctorId);
          if (doctor?.telegramId) {
            await this.bot.sendMessage(doctor.telegramId,
              `📩 *Message from Admin*\n\n${msgText}`,
              { parse_mode: 'Markdown' }
            ).catch(() => {});
          }
        }

        if (flowResult.data?.consultationCreated) {
          const updatedSession = consultationManager.getSession(String(chatId));
          const doctor = doctorPersistence.getDoctorById(updatedSession.doctorId);
          if (doctor) await this.notifyDoctorOfNewConsultation(String(chatId), updatedSession, doctor);
        }

        // Menu-driven doctor assign (handleAdminAssignDoctorInput)
        if (flowResult.data?.doctorId && flowResult.data?.patientPhone && !flowResult.data?.newDoctorId) {
          const doctor = doctorPersistence.getDoctorById(flowResult.data.doctorId);
          await this.bot.sendMessage(flowResult.data.patientPhone,
            `👨⚕️ *Doctor Assigned*\n\nDr. ${doctor?.name || 'a specialist'} has been assigned to your consultation (${flowResult.data.consultationId}).`,
            { parse_mode: 'Markdown' }
          ).catch(() => {});
          // Unlike reassignment (below), the doctor was never notified on
          // the initial assignment at all - they'd have no way to know a
          // patient was waiting short of proactively checking My Patients.
          if (doctor?.telegramId) {
            await this.bot.sendMessage(doctor.telegramId,
              `📩 *New Consultation Assigned*\n\nConsultation: ${flowResult.data.consultationId}\nPatient: ${flowResult.data.patientPhone}\n\nReply to start consultation.`,
              { parse_mode: 'Markdown' }
            ).catch(() => {});
          }
        }

        // Menu-driven doctor reassign (handleAdminReassignDoctorInput)
        if (flowResult.data?.newDoctorId && flowResult.data?.oldDoctorId && flowResult.data?.patientPhone) {
          const newDoctor = doctorPersistence.getDoctorById(flowResult.data.newDoctorId);
          const oldDoctor = doctorPersistence.getDoctorById(flowResult.data.oldDoctorId);
          await this.bot.sendMessage(flowResult.data.patientPhone,
            `👨⚕️ *Doctor Reassigned*\n\nYour consultation has been reassigned to Dr. ${newDoctor?.name || 'a new specialist'}.`,
            { parse_mode: 'Markdown' }
          ).catch(() => {});
          if (oldDoctor?.telegramId) {
            await this.bot.sendMessage(oldDoctor.telegramId,
              `ℹ️ Consultation ${flowResult.data.consultationId} has been reassigned to another doctor.`,
              { parse_mode: 'Markdown' }
            ).catch(() => {});
          }
          if (newDoctor?.telegramId) {
            await this.bot.sendMessage(newDoctor.telegramId,
              `📩 *New Consultation Assigned*\n\nConsultation: ${flowResult.data.consultationId}\nPatient: ${flowResult.data.patientPhone}\n\nReply to start consultation.`,
              { parse_mode: 'Markdown' }
            ).catch(() => {});
          }
        }
} else {
           const response = await this.routeQuery(chatId, text, session);
           await this.bot.sendMessage(chatId, response.message, { parse_mode: 'Markdown' });
         }
} catch (error) {
          console.error('Message handler error:', error);
          if (chatId) {
            await this.bot.sendMessage(chatId, 'An error occurred. Please try again.');
          }
        }
      });

this.bot.on('photo', async (msg) => {
       const chatId = msg.chat.id;
       try {
        const session = consultationManager.getSession(String(chatId));
         const persona = new UserPersona(String(chatId));
         const effectiveRole = this.getEffectiveRole(persona, session);
         const photo = msg.photo[msg.photo.length - 1];
         const fileId = photo.file_id;

         const handled = await this.handleIncomingMedia(chatId, session, effectiveRole, {
           kind: 'photo', fileId, send: (targetId, opts) => this.bot.sendPhoto(targetId, fileId, opts)
         });
         if (handled) return;

      // Check consultation state for patients
      if (effectiveRole === PersonaTypes.PATIENT && !session?.isCaregiver) {
        const consultation = consultationManager.getConsultationByPatient(String(chatId));
        const pending = consultationManager.getPendingConsultationByPatient(String(chatId));
        // Allow uploads for pending or active consultations or when in REPORT_UPLOAD or PROFILE state
        if (!consultation && !pending && session?.flowState !== FlowStates.REPORT_UPLOAD && session?.flowState !== FlowStates.PROFILE && session?.flowState !== FlowStates.PROFILE_DISCOUNT_DOCUMENTS) {
          await this.bot.sendMessage(chatId, 'No active or pending consultation. You cannot upload documents.', { parse_mode: 'Markdown' });
          return;
        }
      }

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
       const chatId = msg.chat.id;
       try {
         const document = msg.document;
         const fileId = document.file_id;

         const session = consultationManager.getSession(String(chatId));
         const persona = new UserPersona(String(chatId));
         const effectiveRole = this.getEffectiveRole(persona, session);

         const handled = await this.handleIncomingMedia(chatId, session, effectiveRole, {
           kind: 'document', fileId, send: (targetId, opts) => this.bot.sendDocument(targetId, fileId, opts)
         });
         if (handled) return;

      // Check consultation state for patients
      if (effectiveRole === PersonaTypes.PATIENT && !session?.isCaregiver) {
        const consultation = consultationManager.getConsultationByPatient(String(chatId));
        const pending = consultationManager.getPendingConsultationByPatient(String(chatId));
        // Allow uploads for pending or active consultations or when in REPORT_UPLOAD or PROFILE state
        if (!consultation && !pending && session?.flowState !== FlowStates.REPORT_UPLOAD && session?.flowState !== FlowStates.PROFILE && session?.flowState !== FlowStates.PROFILE_DISCOUNT_DOCUMENTS) {
          await this.bot.sendMessage(chatId, 'No active or pending consultation. You cannot upload documents.', { parse_mode: 'Markdown' });
          return;
        }
      }

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

    // Find consultation by doctor telegramId (stored in consultation.doctorId as doctor ID)
    const doctorId = doctor?.id;
    const consultation = Array.from(consultationManager.consultations.values())
      .find(c => c.doctorId === doctorId && c.status === 'active');

    // Handle doctor closing consultation (either their own or by providing ID)
    const closeMatch = message.match(/^CLOSE\s+(\S+)$/i);
    if (closeMatch) {
      const consultationId = closeMatch[1];
      const targetConsultation = consultationManager.getConsultationById(consultationId);
      
      if (targetConsultation && (targetConsultation.doctorId === doctorId || persona.isAdmin())) {
        const success = consultationManager.closeConsultation(consultationId, 'doctor');
        if (success) {
          await this.bot.sendMessage(chatId, `✅ Consultation ${consultationId} closed.`);
          console.error(`[NOTIFY] Close consultation notify attempt: chatId=${targetConsultation.patientPhone}, consultationId=${consultationId}`);
          await this.bot.sendMessage(targetConsultation.patientPhone, 
            `🔚 *Consultation Closed*\n\nYour consultation has been marked as complete.`, 
            { parse_mode: 'Markdown' }
          ).catch(e => console.error(`[NOTIFY-FAIL]`, e));
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

    // Check doctor profile completeness before messaging patients
    if (!doctor.name || !doctor.specialty || !doctor.cancerTypes?.length) {
      await this.bot.sendMessage(chatId, 
        `⚠️ *Profile Incomplete*\n\nComplete your doctor profile first. Contact admin to set your specialty and cancer types.\n\nUse /profile to view current profile.`, 
        { parse_mode: 'Markdown' }
      );
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

    // Verify consultation is still active
    if (consultation.status !== 'active') {
      await this.bot.sendMessage(chatId, 
        `❌ Consultation ${consultation.id} is ${consultation.status}. Cannot send messages.`, 
        { parse_mode: 'Markdown' }
      );
      return;
    }

    await this.bot.sendMessage(session.patientPhone, message, { parse_mode: 'Markdown' });
    consultationManager.addMessage(consultation.id, 'doctor', message);
    
    await this.bot.sendMessage(chatId, 'Message sent to patient/caregiver.');
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
        return { message: conversationFlow.getWelcomeMenu(String(chatId)) };
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
      ).catch(e => console.error(`[NOTIFY-FAIL]`, e));
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
    ).catch(e => console.error(`[NOTIFY-FAIL]`, e));
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