const { CancerSpecializations } = require('../models/doctor');
const MasterDataManager = require('../services/masterDataManager');

const masterData = new MasterDataManager();

const FlowStates = {
  WELCOME: 'welcome',
  ROLE_SELECT: 'role_select',
  CAREGIVER_AUTH: 'caregiver_auth',
  CAREGIVER_CONSENT_ACK: 'caregiver_consent_ack',
  PROFILE: 'profile',
  DATA_SHARING_CONSENT: 'data_sharing_consent',
  CANCER_TYPE: 'cancer_type',
  REPORT_UPLOAD: 'report_upload',
  BILLING: 'billing',
  PAYMENT_PENDING: 'payment_pending',
  DOCTOR_SELECT: 'doctor_select',
  CONSULTATION: 'consultation',
  COMPLETED: 'completed',
  ADMIN_FALLBACK: 'admin_fallback'
};

const InteractiveMenus = {
  main: `🩺 *Oncology Consultation*\n\n1️⃣ Select Cancer Type\n2️⃣ View Pricing\n3️⃣ Upload Reports\n4️⃣ My Consultations\n5️⃣ Talk to Admin\n\nReply with number or type your question`,

  roleSelect: `👤 *Role Selection*\n\n1️⃣ I am the patient\n2️⃣ I am helping someone else (caregiver)\n\nReply with number`,

  caregiverAuth: `⚠️ *Caregiver Authorization*\n\nCaregivers can act on behalf of patients with additional acknowledgment.\n\n1️⃣ I am authorized to act on patient's behalf\n2️⃣ I am the patient myself\n\nReply with number`,

  cancerTypes: `🔍 *Select Cancer Type*\n\n1️⃣ Lung Cancer\n2️⃣ Breast Cancer\n3️⃣ Prostate Cancer\n4️⃣ Liver Cancer\n5️⃣ Pancreatic\n6️⃣ Ovarian\n7️⃣ Blood Cancer\n8️⃣ Other/General\n\nReply with number`,

  billing: `💰 *Consultation Pricing*\n\n• First Consultation: ₹1500\n• Follow-up: ₹800\n• Report Review: ₹500\n\n1️⃣ Request Payment Link\n2️⃣ Back to Menu\n\nReply with number`,

  consent: `📋 *Data Sharing Consent*\n\nDo you consent to share anonymized medical data with Jaivika Healthcare Research Foundation for research and commercial purposes?\n\n1. Yes, I consent\n2. No, I do not consent`,

  caregiverConsentAck: `⚠️ *Caregiver Data Sharing Consent*\n\nAs an authorized caregiver, you can provide consent on behalf of the patient.\n\nI acknowledge that:\n- I am authorized to act on patient's behalf\n- I understand the data will be used for research/commercial purposes\n- This consent is recorded with caregiver attribution\n\n1. ✅ I acknowledge and provide consent\n2. ❌ No consent (proceed without sharing)`,

  paymentRequested: `📩 *Payment Request Sent*\n\nYour admin has been notified. You will receive a payment link shortly.`,

  confirmPayment: `✅ *Payment Status*\n\n1️⃣ Payment Completed\n2️⃣ Payment Pending\n3️⃣ Back to Menu\n\nReply "1" after making payment`,

  consultation: `📋 *My Consultations*\n\n1️⃣ Connect (after payment)\n2️⃣ Check Payment Status\n3️⃣ Back to Menu\n\nReply with number`
};

class ConversationFlow {
  constructor(consultationManager, doctorRouter, paymentService) {
    this.consultationManager = consultationManager;
    this.doctorRouter = doctorRouter;
    this.paymentService = paymentService;
  }

  getMessageOptions(state) {
    switch (state) {
      case FlowStates.WELCOME: return InteractiveMenus.main;
      case FlowStates.ROLE_SELECT: return InteractiveMenus.roleSelect;
      case FlowStates.CAREGIVER_AUTH: return InteractiveMenus.caregiverAuth;
      case FlowStates.CAREGIVER_CONSENT_ACK: return InteractiveMenus.caregiverConsentAck;
      case FlowStates.CANCER_TYPE: return InteractiveMenus.cancerTypes;
      case FlowStates.BILLING: return InteractiveMenus.billing;
      case FlowStates.REPORT_UPLOAD: return '📎 Send your diagnostic report (image/PDF)';
      default: return InteractiveMenus.main;
    }
  }

  parseMenuSelection(message, state, phoneNumber, session) {
    const selection = message.trim();
    
    switch (state) {
      case FlowStates.WELCOME:
        return this.handleWelcomeSelection(selection, phoneNumber);
      
      case FlowStates.ROLE_SELECT:
        return this.handleRoleSelection(selection, phoneNumber);
      
case FlowStates.CAREGIVER_AUTH:
        return this.handleCaregiverAuthSelection(selection, phoneNumber);

      case FlowStates.CAREGIVER_CONSENT_ACK:
        return this.handleCaregiverConsentAck(selection, phoneNumber, session);

      case FlowStates.CANCER_TYPE:
        return this.handleCancerTypeSelection(selection);
        
      case FlowStates.DATA_SHARING_CONSENT:
        return this.handleDataSharingConsentInput(phoneNumber, message, session);
        
      case FlowStates.BILLING:
        return this.handleBillingSelection(selection, phoneNumber);
        
      case FlowStates.CONSULTATION:
        return this.handleConsultationMenuSelection(selection, phoneNumber, session);
        
      case FlowStates.ADMIN_FALLBACK:
        return this.handleAdminFallback(phoneNumber, selection);
        
      default:
        return { nextState: FlowStates.WELCOME, response: InteractiveMenus.main };
    }
  }

  handleWelcomeSelection(selection, phoneNumber) {
    if (selection === '0' || selection.toLowerCase() === 'cancel') {
      return this.handleCancel(phoneNumber);
    }

    const flowMap = {
      '1': FlowStates.CANCER_TYPE,
      '2': FlowStates.BILLING,
      '3': FlowStates.REPORT_UPLOAD,
      '4': FlowStates.CONSULTATION,
      '5': FlowStates.ADMIN_FALLBACK
    };

    const nextState = flowMap[selection];
    if (!nextState) {
      return { nextState: FlowStates.WELCOME, response: InteractiveMenus.main };
    }

    return { 
      nextState, 
      response: this.getMessageOptions(nextState),
      data: selection === '2' ? { showPricing: true } : {}
    };
  }

  handleRoleSelection(selection, phoneNumber) {
    if (selection === '1') {
      return this.startPatientProfile(phoneNumber);
    } else if (selection === '2') {
      return {
        nextState: FlowStates.CAREGIVER_AUTH,
        response: InteractiveMenus.caregiverAuth
      };
    }
    return { nextState: FlowStates.ROLE_SELECT, response: InteractiveMenus.roleSelect };
  }

  handleCaregiverAuthSelection(selection, phoneNumber) {
    if (selection === '1') {
      this.consultationManager.updateSession(phoneNumber, {
        profileStep: 'caregiver_info',
        isCaregiver: true,
        caregiverConsentGiven: false
      });
      return {
        nextState: FlowStates.PROFILE,
        response: `📝 Please provide your (caregiver) full name:`
      };
    }
    return this.startPatientProfile(phoneNumber);
  }

  startPatientProfile(phoneNumber) {
    this.consultationManager.updateSession(phoneNumber, {
      flowState: FlowStates.PROFILE,
      profileStep: 'name',
      isCaregiver: false
    });
    return {
      nextState: FlowStates.PROFILE,
      response: `👤 *Patient Profile*\n\nPlease enter your full name:`
    };
  }

  handleCaregiverConsentAck(selection, phoneNumber, session) {
    const profile = session.patientProfile || {};
    
    if (selection === '1') {
      profile.dataSharingConsent = true;
      profile.consentType = 'caregiver';
      this.consultationManager.updateSession(phoneNumber, {
        patientProfile: profile,
        caregiverConsentGiven: true
      });
      return {
        nextState: FlowStates.WELCOME,
        response: `✅ Consent acknowledged and saved!\n\n${this.getGreeting(phoneNumber)}`,
        data: {}
      };
    }
    this.consultationManager.updateSession(phoneNumber, {
      caregiverConsentGiven: true
    });
    return {
      nextState: FlowStates.WELCOME,
      response: `✅ Profile saved (no data sharing consent).\n\n${this.getGreeting(phoneNumber)}`,
      data: {}
    };
  }

  async handleConsultationMenuSelection(selection, phoneNumber, session) {
    if (selection === '1') {
      return this.handleConsultationRequest(phoneNumber, session);
    } else if (selection === '2') {
      return this.handlePaymentStatusCheck(phoneNumber, session);
    }
    return { nextState: FlowStates.WELCOME, response: InteractiveMenus.main };
  }

  async handlePaymentStatusCheck(phoneNumber, session) {
    if (!session.paymentTransaction) {
      return {
        nextState: FlowStates.CONSULTATION,
        response: `No payment transaction found. Request payment first from the main menu.`,
        data: {}
      };
    }

    const isVerified = await this.paymentService.verifyPayment(session.paymentTransaction);
    
    if (isVerified) {
      this.consultationManager.updateSession(phoneNumber, { paymentVerified: true });
      return {
        nextState: FlowStates.CONSULTATION,
        response: `✅ Payment verified! You can now connect to a doctor.\nType 'CONNECT' or select option 1 to proceed.`,
        data: {}
      };
    }

return {
        nextState: FlowStates.CONSULTATION,
        response: `⏳ Payment pending. Please complete your payment to connect.`,
        data: {}
      };
    }

    handleDataSharingConsentInput(phoneNumber, message, session) {
      const selection = message.trim();
      const profile = session.patientProfile || {};
      
      if (selection === '1') {
        profile.dataSharingConsent = true;
        profile.consentType = session.isCaregiver ? 'caregiver' : 'patient';
        this.consultationManager.updateSession(phoneNumber, {
          patientProfile: profile,
          flowState: FlowStates.WELCOME
        });
        return {
          nextState: FlowStates.WELCOME,
          response: `✅ Consent saved!\n\n${this.getGreeting(phoneNumber)}`,
          data: {}
        };
      } else if (selection === '2') {
        profile.dataSharingConsent = false;
        this.consultationManager.updateSession(phoneNumber, {
          patientProfile: profile,
          flowState: FlowStates.WELCOME
        });
        return {
          nextState: FlowStates.WELCOME,
          response: `✅ Profile saved (no data sharing consent).\n\n${this.getGreeting(phoneNumber)}`,
          data: {}
        };
      }
      
      return { 
        nextState: FlowStates.DATA_SHARING_CONSENT, 
        response: InteractiveMenus.consent 
      };
    }

    handleAdminFallback(phoneNumber, message) {
    const session = this.consultationManager.getSession(phoneNumber);
    
    return {
      nextState: FlowStates.ADMIN_FALLBACK,
      response: `👨‍⚕️ Admin has been notified. They will connect you to an available oncologist shortly.\nYour patient ID: ${phoneNumber}`,
      data: { 
        pendingAdmin: true,
        sessionSummary: {
          cancerType: session.cancerType,
          mediaCount: session.media?.length || 0,
          paymentStatus: session.paymentTransaction ? 'pending' : null
        }
      }
    };
  }

  handleCancerTypeSelection(selection) {
    const cancerMap = {
      '1': 'lung',
      '2': 'breast',
      '3': 'prostate',
      '4': 'liver',
      '5': 'pancreatic',
      '6': 'ovarian',
      '7': 'blood',
      '8': 'general'
    };

    const cancerType = cancerMap[selection];
    if (!cancerType) {
      return { nextState: FlowStates.CANCER_TYPE, response: InteractiveMenus.cancerTypes };
    }

    return {
      nextState: FlowStates.BILLING,
      response: InteractiveMenus.billing,
      data: { cancerType }
    };
  }

  handleBillingSelection(selection, phoneNumber) {
    if (selection === '1') {
      return {
        nextState: FlowStates.PAYMENT_PENDING,
        response: InteractiveMenus.paymentRequested,
        data: { paymentRequested: true, summary: this.getPaymentRequestSummary(phoneNumber) }
      };
    }
    return { nextState: FlowStates.WELCOME, response: InteractiveMenus.main };
  }

  createFlowHandler(phoneNumber, message) {
    const session = this.consultationManager.getSession(phoneNumber);
    const profileComplete = this.isProfileComplete(session);
    const currentState = session.flowState || FlowStates.WELCOME;

    if (!profileComplete && currentState === FlowStates.WELCOME) {
      return {
        nextState: FlowStates.ROLE_SELECT,
        response: InteractiveMenus.roleSelect
      };
    }

    if (currentState === FlowStates.PROFILE) {
      return this.handleProfileInput(phoneNumber, message, session);
    }

    if (currentState === FlowStates.DATA_SHARING_CONSENT) {
      return this.handleDataSharingConsentInput(phoneNumber, message, session);
    }

    if (currentState === FlowStates.PAYMENT_PENDING) {
      return {
        nextState: FlowStates.PAYMENT_PENDING,
        response: `⏳ Payment link has been sent to your admin. You will receive it shortly.\nType 'menu' to go back.`,
        data: {}
      };
    }

    const flowResult = this.parseMenuSelection(message, currentState, phoneNumber, session);

    if (flowResult.data?.cancerType) {
      this.consultationManager.updateSession(phoneNumber, {
        cancerType: flowResult.data.cancerType
      });
    }

    return flowResult;
  }

  getPaymentRequestSummary(phoneNumber) {
    const session = this.consultationManager.getSession(phoneNumber);
    return {
      phoneNumber,
      name: session.patientProfile?.name || 'Not provided',
      cancerType: session.cancerType || 'Not selected',
      mediaCount: session.media?.length || 0,
      consultationCount: Array.from(this.consultationManager.consultations.values())
        .filter(c => c.patientPhone === phoneNumber).length,
      dataSharingConsent: session.patientProfile?.dataSharingConsent || false,
      isCaregiver: session.isCaregiver || false
    };
  }

  isProfileComplete(session) {
    const p = session.patientProfile;
    return !!(p && p.name && p.age && p.gender && p.location);
  }

  getGreeting(phoneNumber) {
    const pastConsultations = Array.from(this.consultationManager.consultations.values())
      .filter(c => c.patientPhone === phoneNumber);

    if (pastConsultations.length === 0) {
      return InteractiveMenus.main;
    }

    const last = pastConsultations
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))[0];
    const dateStr = new Date(last.startedAt).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    const statusLabel = last.status === 'completed' ? 'Completed' : 'In Progress';

    return `👋 *Welcome back!*\n\n📅 Last consultation: ${dateStr}\n📋 Status: ${statusLabel}\n👨‍⚕️ Doctor: Dr. ${last.doctorId || 'TBD'}\n\n${InteractiveMenus.main}`;
  }

  handleProfileInput(phoneNumber, message, session) {
    const step = session.profileStep;
    const trimmed = message.trim();

    if (!trimmed) {
      return { nextState: FlowStates.PROFILE, response: 'Please provide a valid input.', data: {} };
    }

    const profile = session.patientProfile || {};
    let nextStep = null;
    let nextPrompt = '';

    switch (step) {
      case 'caregiver_info':
        profile.caregiverName = trimmed;
        nextStep = 'patient_info';
        nextPrompt = 'Please provide the patient\'s full name:';
        break;
      case 'patient_info':
        profile.patientName = trimmed;
        nextStep = 'caregiver_relationship';
        nextPrompt = 'What is your relationship to the patient?\n(e.g., spouse, child, friend, guardian):';
        break;
      case 'caregiver_relationship':
        profile.caregiverRelationship = trimmed;
        nextStep = 'caregiver_reason';
        nextPrompt = 'Why are you acting on behalf of the patient?\n(e.g., mobility issues, language barrier, assistance):';
        break;
      case 'caregiver_reason':
        profile.caregiverReason = trimmed;
        nextStep = 'name';
        nextPrompt = 'Please enter your (caregiver) full name:';
        break;
      case 'name':
        profile.name = trimmed;
        nextStep = 'age';
        nextPrompt = 'Please enter your age:';
        break;
      case 'age':
        profile.age = trimmed;
        nextStep = 'gender';
        nextPrompt = 'Please enter your gender (M/F/Other):';
        break;
      case 'gender':
        profile.gender = trimmed;
        nextStep = 'location';
        nextPrompt = 'Please enter your city/location:';
        break;
      case 'location':
        profile.location = trimmed;
        nextStep = 'completed';
        break;
      default:
        return { nextState: FlowStates.WELCOME, response: this.getGreeting(phoneNumber) };
    }

    this.consultationManager.updateSession(phoneNumber, {
      patientProfile: profile,
      profileStep: nextStep
    });

    if (nextStep === 'completed') {
      const session = this.consultationManager.getSession(phoneNumber);
      if (session.isCaregiver && !session.caregiverConsentGiven) {
        return {
          nextState: FlowStates.CAREGIVER_CONSENT_ACK,
          response: InteractiveMenus.caregiverConsentAck,
          data: {}
        };
      }
      return {
        nextState: FlowStates.WELCOME,
        response: `✅ Profile saved!\n\n${this.getGreeting(phoneNumber)}`,
        data: {}
      };
    }

    return {
      nextState: FlowStates.PROFILE,
      response: nextPrompt,
      data: {}
    };
  }

  handleCancel(phoneNumber) {
    const result = this.consultationManager.resetSession(phoneNumber);
    const doctorNote = result.doctorId ? `\nDoctor ${result.doctorId} has been released.` : '';
    return {
      nextState: FlowStates.WELCOME,
      response: `❌ Consultation cancelled.\n\n${doctorNote}\n\n${this.getGreeting(phoneNumber)}`,
      data: { cancelled: true, doctorId: result.doctorId }
    };
  }

  async handleConsultationRequest(phoneNumber, session) {
    const isVerified = session.paymentTransaction && 
      await this.paymentService.verifyPayment(session.paymentTransaction);
    
    if (!isVerified) {
      return {
        nextState: FlowStates.CONSULTATION,
        response: `💳 Payment required to start consultation.\n\nType 'PAYMENT' from the menu to request a payment link.\nUploaded docs: ${session.media?.length || 0}`,
        data: {}
      };
    }

    const doctor = await this.doctorRouter.findAvailableDoctor(session.cancerType);
    if (!doctor) {
      return {
        nextState: FlowStates.CONSULTATION,
        response: `⏳ No doctors available at the moment. Please try again later.`,
        data: {}
      };
    }

    this.consultationManager.updateSession(phoneNumber, { paymentVerified: true });
    const consultation = this.consultationManager.createConsultation(phoneNumber, doctor.id, session);

    return {
      nextState: FlowStates.CONSULTATION,
      response: `✅ Connected to Dr. ${doctor.name} (${doctor.specialty}).\nConsultation fee: ₹${doctor.fee}\n\nReply to this chat to start your consultation.`,
      data: { consultationCreated: true, doctorName: doctor.name }
    };
  }

  checkIdle(phoneNumber) {
    const session = this.consultationManager.getSession(phoneNumber);
    if (!session || session.flowState === FlowStates.WELCOME) return null;
    
    if (this.consultationManager.isIdle(phoneNumber, 30)) {
      const result = this.consultationManager.resetSession(phoneNumber);
      const doctorNote = result.doctorId ? `\nDoctor ${result.doctorId} released.` : '';
      return {
        response: `⏰ Session reset due to inactivity (30 minutes).${doctorNote}\n\n${this.getGreeting(phoneNumber)}`,
        data: { idle: true, doctorId: result.doctorId }
      };
    }
    return null;
  }
}

module.exports = { ConversationFlow, FlowStates, InteractiveMenus };