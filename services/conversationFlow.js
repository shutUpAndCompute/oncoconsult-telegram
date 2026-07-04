const { CancerSpecializations } = require('../models/doctor');
const MasterDataManager = require('../services/masterDataManager');
const { DISCOUNT_CATEGORIES, TREATMENT_STATUSES } = require('../models/patient');

const masterData = new MasterDataManager();

const FlowStates = {
  WELCOME: 'welcome',
  ROLE_SELECT: 'role_select',
  CAREGIVER_AUTH: 'caregiver_auth',
  CAREGIVER_CONSENT_ACK: 'caregiver_consent_ack',
  CAREGIVER_PATIENT_LINK: 'caregiver_patient_link',
  CAREGIVER_MENU: 'caregiver_menu',
  PROFILE: 'profile',
  PROFILE_AADHAAR: 'profile_aadhaar',
  PROFILE_ADDRESS: 'profile_address',
  PROFILE_PINCODE: 'profile_pincode',
  PROFILE_STATE: 'profile_state',
  PROFILE_DISCOUNT_CATEGORY: 'profile_discount_category',
  PROFILE_DISCOUNT_DOCUMENTS: 'profile_discount_documents',
  PROFILE_CANCER_TYPE: 'profile_cancer_type',
  PROFILE_DIAGNOSIS_DATE: 'profile_diagnosis_date',
  PROFILE_TREATING_HOSPITAL: 'profile_treating_hospital',
  PROFILE_TREATMENT_STATUS: 'profile_treatment_status',
  PROFILE_ONCOLOGIST_NAME: 'profile_oncologist_name',
  PROFILE_MEDICAL_REPORTS: 'profile_medical_reports',
  PROFILE_EMERGENCY_CONTACT_NAME: 'profile_emergency_contact_name',
  PROFILE_EMERGENCY_CONTACT_NUMBER: 'profile_emergency_contact_number',
  PROFILE_EMERGENCY_CONTACT_RELATION: 'profile_emergency_contact_relation',
  PROFILE_CONSENTS: 'profile_consents',
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

Reply with number`,

  personaSelect: (currentPersona) => `👤 *Select Your Role*\n\nCurrent: ${currentPersona || 'Patient'}\n\n1️⃣ Patient Mode\n2️⃣ Caregiver Mode\n0️⃣ Main Menu

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
    text += `*Aadhaar:* ${profile.aadhaarNumber ? 'Provided' : 'Not set'}\n`;
    text += `*Address:* ${profile.address || 'Not set'}\n`;
    text += `*Pin Code:* ${profile.pinCode || 'Not set'}\n`;
    text += `*State:* ${profile.state || 'Not set'}\n`;
    text += `*Cancer Type:* ${profile.cancerType || 'Not set'}\n`;
    text += `*Treating Hospital:* ${profile.treatingHospital || 'Not set'}\n`;
    text += `*Treatment Status:* ${profile.treatmentStatus || 'Not set'}\n`;
    text += `*Medical Reports:* ${profile.medicalReports?.length || 0} uploaded\n`;
    text += `*Emergency Contact:* ${profile.emergencyContactName || 'Not set'} (${profile.emergencyContactRelation || 'Not set'})\n`;
    text += `*Discount Category:* ${profile.discountCategory || 'none'}\n`;
    text += `*Discount Status:* ${profile.discountVerificationStatus || 'not_applied'}\n`;
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

  profileEdit: `✏️ *Edit Profile*\n\nSend your details in this format:\n\`NAME:<name>\nAGE:<age>\nGENDER:<gender>\nAADHAAR:<number>\nADDRESS:<full address>\nCITY:<location>\n\nOr reply FIELD:VALUE on separate lines.`,

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

  billing: `💰 *Consultation Pricing*\n\n• Standard Fee: ₹1500\n• Follow-up: ₹800\n• Report Review: ₹500\nDiscounts are at admin discretion. See discount tiers in admin panel.\n\n1️⃣ Request Payment Link\n2️⃣ Back to Menu\n\nReply with number\n\n💡 Sharing eligibility information qualifies you for discounts at admin discretion.`,

  consent: `📋 *Data Sharing & Discount Consent*\n\nTo qualify for any discounts, you MUST share:\n\n1. Medical eligibility documents (consultation reports, diagnostic reports, medical records)\n2. Socio-economic eligibility documents (if claiming discounted categories)\n\nWithout document sharing, you will be considered for full-fee consultation.\n\nOur administrators will review your eligibility and determine applicable discounts at their discretion.\n\n1. ✅ I consent to share medical data and eligibility information for discount consideration\n2. ❌ No consent (proceed without discount eligibility)`,

  caregiverConsentAck: `⚠️ *Caregiver Data Sharing Consent*\n\nTo qualify for any discounts, the patient MUST share:\n\n1. Medical eligibility documents (consultation reports, diagnostic reports, medical records)\n2. Socio-economic eligibility documents (if claiming discounted categories)\n\nWithout document sharing, full-fee consultation applies.\n\nOur administrators will review eligibility and determine discounts at their discretion.\n\n1. ✅ I acknowledge and provide consent for discount eligibility\n2. ❌ No consent (proceed without discount eligibility)`,

  paymentRequested: `📩 *Payment Request Sent*\n\nYour admin has been notified. They will review your case and send a payment link with the consultation fee.`,

  confirmPayment: `✅ *Payment Status*\n\n1️⃣ Payment Completed\n2️⃣ Payment Pending\n3️⃣ Back to Menu\n\nReply "1" after making payment`,

  consultation: `📋 *My Consultations*\n\n1️⃣ Connect (after payment)\n2️⃣ Check Payment Status\n3️⃣ Withdraw Consultation\n4️⃣ Back to Menu\n\nReply with number`,

  withdrawalConfirm: `⚠️ *Withdraw Consultation*\n\nThis will cancel your pending consultation. Your data will be saved but you'll need to re-request a consultation.\n\n1️⃣ Yes, withdraw\n2️⃣ No, keep consultation\n\nReply with number`,

  withdrawalSuccess: `✅ *Consultation Withdrawn*\n\nYour pending consultation has been cancelled. All uploaded documents are saved.\nYou can request a new consultation anytime from the main menu.`,

  closeConsultationPrompt: `🔚 *Close Consultation*\n\nEnter consultation ID to close:\n\nExample: cons_1234567890\n\n0. Back to Menu`,

  discountCategories: `🏛️ *Discount Category Selection*\n\n1️⃣ BPL / EWS\n2️⃣ Ayushman Bharat (PM-JAY)\n3️⃣ e-Shram (Unorganized Sector)\n4️⃣ Farmer\n5️⃣ Defence / Ex-servicemen\n6️⃣ Paramilitary\n7️⃣ Police\n8️⃣ Government Employee\n9️⃣ Freedom Fighter Dependent\n🔟 Senior Citizen / Retiree\n1️⃣1️⃣ Widow / Single Woman\n1️⃣2️⃣ PwD (UDID)\n1️⃣3️⃣ SC/ST\n1️⃣4️⃣ Minority Community\n1️⃣5️⃣ Rural/Tribal Resident\n1️⃣6️⃣ Healthcare Worker\n1️⃣7️⃣ Teacher / Anganwadi\n1️⃣8️⃣ Journalist\n1️⃣9️⃣ No Discount (Full Fee)\n\nReply with number (mandatory document upload required for any selection except 19)`,

  consentsMenu: `📋 *Mandatory Consents*\n\nPlease confirm all consents to proceed:\n\n1. ✅ Teleconsultation Consent (required)\n2. ✅ Data Sharing Consent (required)\n3. ✅ DPDP Act Compliance (required)\n4. Back to Menu\n\nReply with number to confirm each`,
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
      case FlowStates.PROFILE_AADHAAR: return '🆔 Please enter your Aadhaar number:';
      case FlowStates.PROFILE_ADDRESS: return '🏠 Please enter your full address (with pin code):';
      case FlowStates.PROFILE_STATE: return '📍 Please enter your state:';
      case FlowStates.PROFILE_DISCOUNT_CATEGORY: return InteractiveMenus.discountCategories;
      case FlowStates.PROFILE_DISCOUNT_DOCUMENTS: return '📎 Please upload eligibility documents for your selected discount category (ration card, Ayushman card, etc.):';
      case FlowStates.PROFILE_DISCOUNT_CATEGORY: return InteractiveMenus.discountCategories;
      case FlowStates.PROFILE_CANCER_TYPE: return InteractiveMenus.cancerTypes;
      case FlowStates.PROFILE_TREATING_HOSPITAL: return '🏥 Please enter the treating hospital name:';
      case FlowStates.PROFILE_TREATMENT_STATUS: return `📊 *Treatment Status*\n\n1️⃣ Newly Diagnosed\n2️⃣ Under Treatment\n3️⃣ Post Treatment\n4️⃣ Relapsed\n\nReply with number`;
      case FlowStates.PROFILE_EMERGENCY_CONTACT_NAME: return '📞 Please enter emergency contact name:';
      case FlowStates.PROFILE_EMERGENCY_CONTACT_NUMBER: return '📱 Please enter emergency contact number:';
      case FlowStates.PROFILE_EMERGENCY_CONTACT_RELATION: return '👨‍👩‍👧‍👦 Please enter your relationship to the patient:';
      case FlowStates.PROFILE_MEDICAL_REPORTS: return '📎 Please upload at least one medical report (biopsy, imaging, discharge summary):';
      case FlowStates.PROFILE_CONSENTS: return InteractiveMenus.consentsMenu;
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

      case FlowStates.CAREGIVER_PATIENT_LINK:
        return this.handleCaregiverPatientLink(phoneNumber, message, session);

      case FlowStates.CAREGIVER_MENU:
        return this.handleCaregiverMenuSelection(selection, phoneNumber, session);

      case FlowStates.DOCTOR_MENU:
        return { nextState: FlowStates.DOCTOR_MENU, response: InteractiveMenus.doctorMenu('Doctor', false) };

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

  handleCaregiverPatientLink(phoneNumber, message, session) {
    const patientPhone = message.trim();
    
    if (!patientPhone || !patientPhone.match(/^d{10}$/)) {
      return {
        nextState: FlowStates.CAREGIVER_PATIENT_LINK,
        response: `📲 *Link to Patient*

Enter the patient's phone number (10 digits):

Example: 9876543210`
      };
    }
    
    this.consultationManager.updateSession(phoneNumber, {
      linkedPatientPhone: patientPhone
    });
    
    const linkedSession = this.consultationManager.getSession(patientPhone);
    if (linkedSession?.patientProfile) {
      return {
        nextState: FlowStates.CAREGIVER_MENU,
        response: InteractiveMenus.caregiverMenu(linkedSession.patientProfile.name || patientPhone)
      };
    }
    
    return {
      nextState: FlowStates.CAREGIVER_MENU,
      response: InteractiveMenus.caregiverMenu(patientPhone)
    };
  }

  handleCaregiverMenuSelection(selection, phoneNumber, session) {
    const flowMap = {
      '1': () => ({ nextState: FlowStates.CANCER_TYPE, response: InteractiveMenus.cancerTypes }),
      '2': () => ({ nextState: FlowStates.BILLING, response: InteractiveMenus.billing }),
      '3': () => ({ nextState: FlowStates.REPORT_UPLOAD, response: '📎 Send your diagnostic report (image/PDF)' }),
      '4': () => ({ nextState: FlowStates.CONSULTATION, response: InteractiveMenus.consultation }),
      '5': () => ({ nextState: FlowStates.ADMIN_FALLBACK, response: this.handleAdminFallback(phoneNumber, '') }),
      '6': () => ({ nextState: FlowStates.WELCOME, response: '🗑️ Type /clear to delete all chat history and end consultations.' }),
      '7': () => ({ nextState: FlowStates.PROFILE_VIEW, response: InteractiveMenus.profileMenu }),
      '0': () => ({ nextState: FlowStates.WELCOME, response: InteractiveMenus.personaSelect('caregiver') })
    };
    
    const handler = flowMap[selection];
    if (handler) {
      return handler();
    }
    return { nextState: FlowStates.CAREGIVER_MENU, response: InteractiveMenus.caregiverMenu(session?.patientName) };
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
      profile.consentTeleconsultation = true;
      profile.consentDataSharing = true;
      profile.consentDPDP = true;
      this.consultationManager.updateSession(phoneNumber, {
        patientProfile: profile,
        caregiverConsentGiven: true
      });
      return {
        nextState: FlowStates.PROFILE,
        response: `✅ Consent acknowledged. Please complete your profile to proceed.`,
        data: {}
      };
    }
    this.consultationManager.updateSession(phoneNumber, {
      caregiverConsentGiven: true
    });
    return {
      nextState: FlowStates.PROFILE,
      response: `ℹ️ You may proceed without consent. Complete your profile to access consultations.`,
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

    if (session?.doctorId) {
      this.consultationManager.releaseDoctorIfAssigned(phoneNumber);
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
    if (!p) return false;
    return !!(p.name && p.age && p.gender && p.aadhaarNumber && p.address && p.state &&
      p.cancerType && p.treatingHospital && p.treatmentStatus &&
      p.emergencyContactName && p.emergencyContactNumber && p.emergencyContactRelation &&
      p.medicalReports && p.medicalReports.length > 0 &&
      p.consentTeleconsultation && p.consentDataSharing && p.consentDPDP);
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
        nextStep = 'aadhaar';
        nextPrompt = '🆔 Please enter your Aadhaar number (mandatory):';
        break;
      case 'aadhaar':
        profile.aadhaarNumber = trimmed;
        nextStep = 'address';
        nextPrompt = '🏠 Please enter your full address (mandatory):';
        break;
      case 'address':
        profile.address = trimmed;
        nextStep = 'state';
        nextPrompt = '📍 Please enter your state (mandatory):';
        break;
      case 'state':
        profile.state = trimmed;
        nextStep = 'cancer_type';
        nextPrompt = InteractiveMenus.cancerTypes;
        break;
      case 'cancer_type':
        const cancerMap = { '1': 'lung', '2': 'breast', '3': 'prostate', '4': 'liver', '5': 'pancreatic', '6': 'ovarian', '7': 'blood', '8': 'general' };
        if (!cancerMap[trimmed]) {
          return { nextState: FlowStates.PROFILE, response: InteractiveMenus.cancerTypes, data: {} };
        }
        profile.cancerType = cancerMap[trimmed];
        nextStep = 'treating_hospital';
        nextPrompt = '🏥 Please enter the treating hospital name (mandatory):';
        break;
      case 'treating_hospital':
        profile.treatingHospital = trimmed;
        nextStep = 'treatment_status';
        nextPrompt = `📊 *Treatment Status*\n\n1️⃣ Newly Diagnosed\n2️⃣ Under Treatment\n3️⃣ Post Treatment\n4️⃣ Relapsed\n\nReply with number`;
        break;
      case 'treatment_status':
        if (!['1', '2', '3', '4'].includes(trimmed)) {
          return { nextState: FlowStates.PROFILE, response: `📊 *Treatment Status*\n\n1️⃣ Newly Diagnosed\n2️⃣ Under Treatment\n3️⃣ Post Treatment\n4️⃣ Relapsed\n\nReply with number`, data: {} };
        }
        const statusMap = { '1': 'newly_diagnosed', '2': 'under_treatment', '3': 'post_treatment', '4': 'relapsed' };
        profile.treatmentStatus = statusMap[trimmed];
        nextStep = 'medical_reports';
        nextPrompt = '📎 Please upload at least one medical report (mandatory - biopsy, imaging, discharge summary):';
        break;
      case 'medical_reports':
        nextStep = 'emergency_contact_name';
        nextPrompt = '📞 Please enter emergency contact name (mandatory):';
        break;
      case 'emergency_contact_name':
        profile.emergencyContactName = trimmed;
        nextStep = 'emergency_contact_number';
        nextPrompt = '📱 Please enter emergency contact number (mandatory):';
        break;
      case 'emergency_contact_number':
        profile.emergencyContactNumber = trimmed;
        nextStep = 'emergency_contact_relation';
        nextPrompt = '👨‍👩‍👧‍👦 Please enter your relationship to the patient (mandatory):';
        break;
      case 'emergency_contact_relation':
        profile.emergencyContactRelation = trimmed;
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
      '3': () => ({ nextState: FlowStates.ADMIN_MENU, response: `👨‍⚕️ *Assign Doctor*

Enter: ASSIGN_DOCTOR <consultation_id> <doctor_id>

Example: ASSIGN_DOCTOR cons_1234567890 doc_9876543210

Or reply CONSULTATION_ID to list available doctors.` }),
      '4': () => ({ nextState: FlowStates.ADMIN_MENU, response: `📎 *Verify Discount Document*

Enter: VERIFY_DISCOUNT <patient_phone> <approved/rejected> [reason]

Example: VERIFY_DISCOUNT 9876543210 approved

Pending documents: checking...` }),
      '5': () => ({ nextState: FlowStates.ADMIN_MENU, response: `💳 *Verify Payment*

Enter: VERIFY_PAYMENT <transaction_id>

Example: VERIFY_PAYMENT txn_abc123` }),
      '6': () => this.getCloseConsultationPrompt(),
      '7': () => ({ nextState: FlowStates.PROFILE_VIEW, response: InteractiveMenus.profileMenu }),
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