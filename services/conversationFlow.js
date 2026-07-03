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
  CONSULTATION_WITHDRAW: 'consultation_withdraw',
  COMPLETED: 'completed',
  ADMIN_FALLBACK: 'admin_fallback',
  ADMIN_MENU: 'admin_menu',
  ADMIN_CLOSE_CONSULTATION: 'admin_close_consultation',
  DOCTOR_MENU: 'doctor_menu',
  CAREGIVER_MENU: 'caregiver_menu',
  PROFILE_VIEW: 'profile_view',
  PROFILE_EDIT: 'profile_edit',
  ROLE_APPLICATION: 'role_application'
};

const InteractiveMenus = {
  main: (persona = 'patient') => `🩺 *Oncology Consultation*\n\n1️⃣ Select Cancer Type\n2️⃣ View Pricing\n3️⃣ Upload Reports\n4️⃣ My Consultations\n5️⃣ Talk to Admin
6️⃣ Clear History
7️⃣ 👤 Profile & Roles

Reply with number or type your question`,

  personaSelect: (currentPersona) => `👤 *Select Your Role*\n\nCurrent: ${currentPersona || 'none'}\n\n1️⃣ Patient Mode\n2️⃣ Caregiver Mode\n0️⃣ Back to Menu

Reply with number`,

  adminMenu: `🛠️ *Admin Panel*\n\n1️⃣ Pending Requests\n2️⃣ Active Consultations\n3️⃣ Close Consultation\n4️⃣ My Profile\n0️⃣ Switch Role

Reply with number`,

  doctorRegister: `📝 *Doctor Registration*\n\nPlease provide your full name and specialization.\n\nExample: John Smith, Medical Oncology`,

  mobileCollection: `📱 *Phone Verification*\n\nPlease share your mobile number using:\n/sharecontact or type /skip to continue`,

  profileMenu: `👤 *Profile & Roles*\n\n1️⃣ View Profile\n2️⃣ Edit Profile\n3️⃣ Apply for Role\n4️⃣ My Roles\n5️⃣ Back to Menu

Reply with number`,

  profileView: (profile, isCaregiver) => {
    let text = `📋 *Your Profile*\n\n`;
    text += `*Name:* ${profile.name || 'Not set'}\n`;
    text += `*Age:* ${profile.age || 'Not set'}\n`;
    text += `*Gender:* ${profile.gender || 'Not set'}\n`;
    text += `*Location:* ${profile.location || 'Not set'}\n`;
    if (isCaregiver && profile.caregiverName) {
      text += `\n*Caregiver Name:* ${profile.caregiverName}\n`;
    }
    if (isCaregiver && profile.patientName) {
      text += `*Patient Name:* ${profile.patientName}\n`;
    }
    if (isCaregiver && profile.caregiverRelationship) {
      text += `*Relationship:* ${profile.caregiverRelationship}\n`;
    }
    text += `\n💡 Reply "EDIT" to modify your profile or "MENU" for options.`;
    return text;
  },

  profileEdit: `✏️ *Edit Profile*\n\nSend your details in this format:\n\`NAME:<name>\nAGE:<age>\nGENDER:<gender>\nCITY:<location>\n\nOr reply FIELD:VALUE on separate lines.`,

  roleApplication: `📝 *Apply for Role*\n\n1️⃣ Doctor\n2️⃣ Caregiver\n3️⃣ Support\n4️⃣ Cancel

Roles require admin approval. Select a role to apply for.`,

  myRoles: (roles, roleStatus) => {
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
    text += `\nUse "APPLY:ROLE" to request a new role.`;
    return text;
  },

  doctorMenu: `👨‍⚕️ *Doctor Menu*\n\n1️⃣ Status\n2️⃣ My Profile\n\nOr reply to patient messages in consultation.`,

  roleSelect: `👤 *Role Selection*\n\n1️⃣ I am the patient\n2️⃣ I am helping someone else (caregiver)\n\nReply with number`,

  caregiverAuth: `⚠️ *Caregiver Authorization*\n\nCaregivers can act on behalf of patients with additional acknowledgment.\n\n1️⃣ I am authorized to act on patient's behalf\n2️⃣ I am the patient myself\n\nReply with number`,

  cancerTypes: `🔍 *Select Cancer Type*\n\n1️⃣ Lung Cancer\n2️⃣ Breast Cancer\n3️⃣ Prostate Cancer\n4️⃣ Liver Cancer\n5️⃣ Pancreatic\n6️⃣ Ovarian\n7️⃣ Blood Cancer\n8️⃣ Other/General\n\nReply with number`,

  billing: `💰 *Consultation Pricing*\n\n• First Consultation: ₹1500\n• Follow-up: ₹800\n• Report Review: ₹500\n\n1️⃣ Request Payment Link\n2️⃣ Back to Menu\n\nReply with number`,

  consent: `📋 *Data Sharing Consent*\n\nDo you consent to share anonymized medical data with Jaivika Healthcare Research Foundation for research and commercial purposes?\n\n1. Yes, I consent\n2. No, I do not consent`,

  caregiverConsentAck: `⚠️ *Caregiver Data Sharing Consent*\n\nAs an authorized caregiver, you can provide consent on behalf of the patient.\n\nI acknowledge that:\n- I am authorized to act on patient's behalf\n- I understand the data will be used for research/commercial purposes\n- This consent is recorded with caregiver attribution\n\n1. ✅ I acknowledge and provide consent\n2. ❌ No consent (proceed without sharing)`,

  paymentRequested: `📩 *Payment Request Sent*\n\nYour admin has been notified. They will review your case and send a payment link with the consultation fee.`,

  confirmPayment: `✅ *Payment Status*\n\n1️⃣ Payment Completed\n2️⃣ Payment Pending\n3️⃣ Back to Menu\n\nReply "1" after making payment`,

  consultation: `📋 *My Consultations*\n\n1️⃣ Connect (after payment)\n2️⃣ Check Payment Status\n3️⃣ Withdraw Consultation\n4️⃣ Back to Menu\n\nReply with number`,

  withdrawalConfirm: `⚠️ *Withdraw Consultation*\n\nThis will cancel your pending consultation. Your data will be saved but you'll need to re-request a consultation.\n\n1️⃣ Yes, withdraw\n2️⃣ No, keep consultation\n\nReply with number`,

  withdrawalSuccess: `✅ *Consultation Withdrawn*\n\nYour pending consultation has been cancelled. All uploaded documents are saved.\nYou can request a new consultation anytime from the main menu.`,

  closeConsultationPrompt: `🔚 *Close Consultation*\n\nEnter consultation ID to close:\n\nExample: cons_1234567890\n\n0. Back to Menu`
};

class ConversationFlow {
  constructor(consultationManager, doctorRouter, paymentService, userRegistry = null) {
    this.consultationManager = consultationManager;
    this.doctorRouter = doctorRouter;
    this.paymentService = paymentService;
    this.userRegistry = userRegistry;
  }

getMessageOptions(state, persona = 'patient') {
    switch (state) {
      case FlowStates.WELCOME: return InteractiveMenus.main(persona);
      case FlowStates.ROLE_SELECT: return InteractiveMenus.roleSelect;
      case FlowStates.CAREGIVER_AUTH: return InteractiveMenus.caregiverAuth;
      case FlowStates.CAREGIVER_CONSENT_ACK: return InteractiveMenus.caregiverConsentAck;
      case FlowStates.CANCER_TYPE: return InteractiveMenus.cancerTypes;
      case FlowStates.BILLING: return InteractiveMenus.billing;
      case FlowStates.REPORT_UPLOAD: return '📎 Send your diagnostic report (image/PDF)';
      case FlowStates.PROFILE_VIEW: return InteractiveMenus.profileMenu;
      case FlowStates.PROFILE_EDIT: return InteractiveMenus.profileEdit;
      case FlowStates.ROLE_APPLICATION: return InteractiveMenus.roleApplication;
      case FlowStates.CONSULTATION_WITHDRAW: return InteractiveMenus.withdrawalConfirm;
      case FlowStates.ADMIN_MENU: return InteractiveMenus.adminMenu;
      case FlowStates.ADMIN_CLOSE_CONSULTATION: return InteractiveMenus.closeConsultationPrompt;
      default: return InteractiveMenus.main(persona);
    }
  }

  parseMenuSelection(message, state, phoneNumber, session) {
    const selection = message.trim();
    
    switch (state) {
      case FlowStates.WELCOME:
        return this.handleWelcomeSelection(selection, phoneNumber);
        
      case FlowStates.ADMIN_MENU:
        return this.handleAdminMenuSelection(selection, phoneNumber);
        
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

      case FlowStates.CONSULTATION_WITHDRAW:
        return this.handleWithdrawalConfirmation(selection, phoneNumber, session);

      case FlowStates.ADMIN_CLOSE_CONSULTATION:
        return this.handleAdminCloseConsultation(message, phoneNumber);

      case FlowStates.ADMIN_FALLBACK:
        return this.handleAdminFallback(phoneNumber, selection);

      case FlowStates.PROFILE_VIEW:
        return this.handleProfileMenuSelection(selection, phoneNumber, session);

      case FlowStates.PROFILE_EDIT:
        return this.handleProfileEditInput(phoneNumber, message, session);

      case FlowStates.ROLE_APPLICATION:
        return this.handleRoleApplicationSelection(selection, phoneNumber);

      default:
        return { nextState: FlowStates.WELCOME, response: InteractiveMenus.main() };
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
      '5': FlowStates.ADMIN_FALLBACK,
      '6': FlowStates.WELCOME,
      '7': FlowStates.PROFILE_VIEW
    };

    const nextState = flowMap[selection];
    if (!nextState) {
      // Handle clear history option (6)
      if (selection === '6') {
        return { nextState: FlowStates.WELCOME, response: "🗑️ Type /clear to delete all chat history and end consultations." };
      }
      return { nextState: FlowStates.WELCOME, response: InteractiveMenus.main() };
    }

    return { 
      nextState, 
      response: this.getMessageOptions(nextState, 'patient'),
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
    } else if (selection === '3') {
      return this.handleWithdrawalRequest(phoneNumber, session);
    }
    return { nextState: FlowStates.WELCOME, response: InteractiveMenus.main() };
  }

  handleWithdrawalRequest(phoneNumber, session) {
    if (!session.consultationId && !session.paymentTransaction) {
      return {
        nextState: FlowStates.WELCOME,
        response: `⚠️ No pending consultation or payment request found.\n\n${InteractiveMenus.main()}`,
        data: {}
      };
    }
    return {
      nextState: FlowStates.CONSULTATION_WITHDRAW,
      response: InteractiveMenus.withdrawalConfirm,
      data: {}
    };
  }

  async handleWithdrawalConfirmation(selection, phoneNumber, session) {
    if (selection === '1') {
      return this.executeWithdrawal(phoneNumber, session);
    }
    return {
      nextState: FlowStates.CONSULTATION,
      response: `❌ Withdrawal cancelled. Your consultation remains active.\n\n${InteractiveMenus.consultation}`,
      data: {}
    };
  }

  executeWithdrawal(phoneNumber, session) {
    const pendingConsultation = this.consultationManager.getPendingConsultationByPatient(phoneNumber);
    if (pendingConsultation) {
      this.consultationManager.consultations.delete(pendingConsultation.id);
      this.consultationManager.persistence.saveConsultations();
    }

    this.consultationManager.updateSession(phoneNumber, {
      consultationId: null,
      paymentTransaction: null,
      pendingPayment: null,
      paymentVerified: false
    });

    return {
      nextState: FlowStates.WELCOME,
      response: InteractiveMenus.withdrawalSuccess,
      data: { withdrawn: true }
    };
  }

async handlePaymentStatusCheck(phoneNumber, session) {
    if (!session.paymentTransaction) {
      return {
        nextState: FlowStates.CONSULTATION,
        response: `No payment transaction found. Request payment first from the main menu.`,
        data: {}
      };
    }

    const payment = this.paymentService.payments.get(session.paymentTransaction);
    if (payment?.feePending) {
      return {
        nextState: FlowStates.CONSULTATION,
        response: `⏳ Fee is being determined by admin. You will receive payment instructions shortly.\n\nTransaction: ${session.paymentTransaction}`,
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
      response: `⏳ Payment pending. Please complete your payment to connect.\n\nAmount: ₹${payment?.amount || 'TBD'}`,
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
    return { nextState: FlowStates.WELCOME, response: InteractiveMenus.main() };
  }

  createFlowHandler(phoneNumber, message) {
    const session = this.consultationManager.getSession(phoneNumber);
    const profileComplete = this.isProfileComplete(session);
    const currentState = session.flowState || FlowStates.WELCOME;

    if (!profileComplete && currentState === FlowStates.WELCOME) {
      return {
        nextState: FlowStates.ROLE_SELECT,
        response: `👤 *Profile Required*\n\nComplete your profile to access consultation services.\n\n${InteractiveMenus.roleSelect(session?.selectedPersona)}`
      };
    }

    // Lock consultation flow if profile incomplete
    if (!profileComplete && ['cancer_type', 'billing', 'report_upload', 'consultation'].includes(currentState)) {
      return {
        nextState: FlowStates.WELCOME,
        response: `⚠️ *Profile Incomplete*\n\nPlease complete your profile first:\n• Name: ${session.patientProfile?.name ? '✅' : '❌'}\n• Age: ${session.patientProfile?.age ? '✅' : '❌'}\n• Gender: ${session.patientProfile?.gender ? '✅' : '❌'}\n• Location: ${session.patientProfile?.location ? '✅' : '❌'}\n\nUse option 7 (Profile & Roles) to update.`
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
        response: `⏳ Payment link has been sent to your admin. You will receive it shortly.\n\n0. Back to Menu`,
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
      return InteractiveMenus.main();
    }

    const last = pastConsultations
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))[0];
    const dateStr = new Date(last.startedAt).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    const statusLabel = last.status === 'completed' ? 'Completed' : 'In Progress';

    return `👋 *Welcome back!*\n\n📅 Last consultation: ${dateStr}\n📋 Status: ${statusLabel}\n👨‍⚕️ Doctor: Dr. ${last.doctorId || 'TBD'}\n\n${InteractiveMenus.main()}`;
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

  handleProfileMenuSelection(selection, phoneNumber, session) {
    const flowMap = {
      '1': () => this.handleViewProfile(phoneNumber, session),
      '2': () => this.handleEditProfile(phoneNumber),
      '3': () => ({ nextState: FlowStates.ROLE_APPLICATION, response: InteractiveMenus.roleApplication }),
      '4': () => this.handleMyRoles(phoneNumber),
      '5': () => ({ nextState: FlowStates.WELCOME, response: InteractiveMenus.main() })
    };

    const handler = flowMap[selection];
    if (handler) {
      return handler();
    }
    return { nextState: FlowStates.PROFILE_VIEW, response: InteractiveMenus.profileMenu };
  }

  handleViewProfile(phoneNumber, session) {
    const profile = session?.patientProfile || {};
    const isCaregiver = session?.isCaregiver || false;
    return {
      nextState: FlowStates.PROFILE_VIEW,
      response: InteractiveMenus.profileView(profile, isCaregiver)
    };
  }

  handleEditProfile(phoneNumber) {
    return {
      nextState: FlowStates.PROFILE_EDIT,
      response: InteractiveMenus.profileEdit
    };
  }

  handleProfileEditInput(phoneNumber, message, session) {
    if (message.trim().toLowerCase() === 'menu' || message.trim() === '5') {
      return {
        nextState: FlowStates.PROFILE_VIEW,
        response: InteractiveMenus.profileMenu
      };
    }

    const profile = session?.patientProfile || {};
    const updates = {};

    const lines = message.split('\n');
    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();
      const upperKey = key.trim().toUpperCase();
      if (upperKey === 'NAME') updates.name = value;
      else if (upperKey === 'AGE') updates.age = value;
      else if (upperKey === 'GENDER') updates.gender = value;
      else if (upperKey === 'CITY' || upperKey === 'LOCATION') updates.location = value;
    }

    if (Object.keys(updates).length === 0) {
      return {
        nextState: FlowStates.PROFILE_EDIT,
        response: `No valid fields found. Use format: NAME:<value>\nAGE:<value>\nGENDER:<value>\nCITY:<value>`,
        data: {}
      };
    }

    const updatedProfile = { ...profile, ...updates };
    this.consultationManager.updateSession(phoneNumber, {
      patientProfile: updatedProfile
    });

    // Also sync to userRegistry
    this.userRegistry?.updateUserProfile(phoneNumber, updatedProfile);

    return {
      nextState: FlowStates.PROFILE_VIEW,
      response: `✅ Profile updated!\n\n${InteractiveMenus.profileView(updatedProfile, session?.isCaregiver)}`
    };
  }

  handleMyRoles(phoneNumber) {
    const user = this.userRegistry?.getUser(phoneNumber) || this.userRegistry?.getUserByPhone(phoneNumber);
    const roles = user?.appliedRoles || [];
    const roleStatus = user?.roleStatus || {};
    return {
      nextState: FlowStates.PROFILE_VIEW,
      response: InteractiveMenus.myRoles(roles, roleStatus)
    };
  }

  handleRoleApplicationSelection(selection, phoneNumber) {
    const roleMap = {
      '1': 'doctor',
      '2': 'caregiver',
      '3': 'support',
      '4': null
    };

    const role = roleMap[selection];
    if (!role) {
      return { nextState: FlowStates.PROFILE_VIEW, response: InteractiveMenus.profileMenu };
    }

    this.userRegistry?.requestRole(phoneNumber, role);

    return {
      nextState: FlowStates.PROFILE_VIEW,
      response: `✅ Role request for *${role}* submitted. Admin will review and approve.\n\n${InteractiveMenus.profileMenu}`
    };
  }

  handleAdminMenuSelection(selection, phoneNumber) {
    const flowMap = {
      '1': () => this.getPendingRequests(phoneNumber),
      '2': () => this.getActiveConsultations(phoneNumber),
      '3': () => this.getCloseConsultationPrompt(),
      '0': () => ({ nextState: FlowStates.WELCOME, response: InteractiveMenus.main() })
    };

    const handler = flowMap[selection];
    if (handler) {
      return handler();
    }
    return { nextState: FlowStates.ADMIN_MENU, response: InteractiveMenus.adminMenu };
  }

  getPendingRequests(phoneNumber) {
    const pending = this.consultationManager.getPendingForAdmin();
    let text = `📋 *Pending Consultations*\n\n`;
    
    if (pending.length === 0) {
      text += `_No pending consultations_\n`;
    } else {
      pending.forEach(c => {
        text += `• ${c.patientPhone} - ${c.cancerType || 'not set'} - ${c.media?.length || 0} docs\n`;
      });
    }
    
    return {
      nextState: FlowStates.ADMIN_MENU,
      response: text + `\n${InteractiveMenus.adminMenu}`
    };
  }

  getActiveConsultations(phoneNumber) {
    const active = Array.from(this.consultationManager.consultations.values())
      .filter(c => c.status === 'active');
    let text = `📊 *Active Consultations*\n\n`;
    
    if (active.length === 0) {
      text += `_No active consultations_\n`;
    } else {
      active.forEach(c => {
        text += `• ${c.id}: ${c.patientPhone} - Dr. ${c.doctorId || 'unassigned'}\n`;
      });
    }
    
    return {
      nextState: FlowStates.ADMIN_MENU,
      response: text + `\n${InteractiveMenus.adminMenu}`
    };
  }

  getCloseConsultationPrompt() {
    return {
      nextState: FlowStates.ADMIN_CLOSE_CONSULTATION,
      response: `🔚 *Close Consultation*\n\nSend the consultation ID to close.\n\nExample: cons_1234567890\n\n0. Back to Menu`
    };
  }

  async handleAdminCloseConsultation(message, phoneNumber) {
    const selection = message.trim();
    
    if (selection === '0') {
      return { nextState: FlowStates.ADMIN_MENU, response: InteractiveMenus.adminMenu };
    }
    
    if (selection.match(/^cons_\d+/) || selection.match(/^pending_\d+/)) {
      const consultation = this.consultationManager.getConsultationById(selection);
      if (consultation && (consultation.status === 'active' || consultation.status === 'pending')) {
        const success = this.consultationManager.closeConsultation(selection, 'admin');
        if (success) {
          return {
            nextState: FlowStates.ADMIN_MENU,
            response: `✅ Consultation ${selection} closed.\n\n${InteractiveMenus.adminMenu}`
          };
        }
      }
      return {
        nextState: FlowStates.ADMIN_CLOSE_CONSULTATION,
        response: `❌ Consultation not found or cannot be closed.\n\n${InteractiveMenus.closeConsultationPrompt}`
      };
    }
    
    return { nextState: FlowStates.ADMIN_CLOSE_CONSULTATION, response: InteractiveMenus.closeConsultationPrompt };
  }

  setFee(phoneNumber, transactionId, amount, adminNote = '') {
    const success = this.paymentService.setFee(transactionId, amount, adminNote);
    if (success) {
      this.consultationManager.updateSession(phoneNumber, {
        feeSetAt: new Date(),
        adminFeeNote: adminNote
      });
    }
    return success;
  }
}

module.exports = { ConversationFlow, FlowStates, InteractiveMenus };