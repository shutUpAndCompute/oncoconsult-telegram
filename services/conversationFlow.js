const { CancerSpecializations } = require('../models/doctor');
const MasterDataManager = require('../services/masterDataManager');
const { DISCOUNT_CATEGORIES, TREATMENT_STATUSES } = require('../models/patient');

const masterData = new MasterDataManager();

const FlowStates = {
  PLATFORM_TERMS: 'platform_terms',
  WELCOME: 'welcome',
  ROLE_SELECT: 'role_select',
  CAREGIVER_AUTH: 'caregiver_auth',
  CAREGIVER_CONSENT_ACK: 'caregiver_consent_ack',
  CAREGIVER_PATIENT_LINK: 'caregiver_patient_link',
  CAREGIVER_MENU: 'caregiver_menu',
PROFILE: 'profile',
   PROFILE_DISCOUNT_CATEGORY: 'profile_discount_category',
   PROFILE_DISCOUNT_DOCUMENTS: 'profile_discount_documents',
   PROFILE_CONSENTS: 'profile_consents',
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
   ADMIN_BOOTSTRAP_SECRET: 'admin_bootstrap_secret',
   SUPPORT_MENU: 'support_menu',
   ADMIN_ROLE_APPROVALS: 'admin_role_approvals',
   ADMIN_INVITE_DOCTOR_INPUT: 'admin_invite_doctor_input',
   ADMIN_REGISTER_DOCTOR_INPUT: 'admin_register_doctor_input',
   ADMIN_APPROVE_DOCTOR_INPUT: 'admin_approve_doctor_input',
   ADMIN_APPROVE_CAREGIVER_INPUT: 'admin_approve_caregiver_input',
   ADMIN_APPROVE_SUPPORT_INPUT: 'admin_approve_support_input',
  ADMIN_DOCTOR_MANAGEMENT: 'admin_doctor_management',
  ADMIN_ASSIGN_DOCTOR_INPUT: 'admin_assign_doctor_input',
  ADMIN_REMOVE_DOCTOR_INPUT: 'admin_remove_doctor_input',
  ADMIN_REJECT_DOCTOR_INPUT: 'admin_reject_doctor_input',
  ADMIN_MESSAGE_DOCTOR_INPUT: 'admin_message_doctor_input',
  ADMIN_REASSIGN_DOCTOR_INPUT: 'admin_reassign_doctor_input',
  ADMIN_MESSAGE_PATIENT_INPUT: 'admin_message_patient_input',
  ADMIN_VERIFY_PAYMENT_INPUT: 'admin_verify_payment_input',
  ADMIN_VERIFY_DISCOUNT_INPUT: 'admin_verify_discount_input',
ADMIN_CLOSE_CONSULTATION: 'admin_close_consultation',
    DOCTOR_MENU: 'doctor_menu',
    DOCTOR_PROFILE_EDIT: 'doctor_profile_edit',
    DOCTOR_MSG_ADMIN_INPUT: 'doctor_msg_admin_input',
    PROFILE_VIEW: 'profile_view',
   PROFILE_EDIT: 'profile_edit',
   ADMIN_PROFILE_EDIT: 'admin_profile_edit',
   ROLE_APPLICATION: 'role_application',
  PROFILE_REMOVE_ROLE: 'profile_remove_role',
  MOBILE_COLLECTION: 'mobile_collection',
   PERSONA_SELECT: 'persona_select',
   ADMIN_ADD_ADMIN_INPUT: 'admin_add_admin_input',
   ADMIN_REMOVE_ADMIN_INPUT: 'admin_remove_admin_input'
 };

const InteractiveMenus = {
   main: (persona = 'patient') => `🩺 *Oncology Consultation*\n\n1️⃣ My Consultations\n2️⃣ 👤 Profile & Roles\n\nReply with number`,
   personaSelect: (currentPersona, approvedRoles = []) => {
    const options = ['1️⃣ Patient Mode'];
    if (approvedRoles.includes('caregiver')) options.push('2️⃣ Caregiver Mode');
    if (approvedRoles.includes('doctor')) options.push('3️⃣ Doctor Mode');
    if (approvedRoles.includes('admin') || approvedRoles.includes('super_admin')) options.push('4️⃣ Admin Mode');
    if (approvedRoles.includes('support')) options.push('5️⃣ Support Mode');
    options.push('0️⃣ Main Menu');
    return `👤 *Select Your Role*\n\nCurrent: ${currentPersona || 'Patient'}\n\n${options.join('\n')}\n\nReply with number`;
  },

   adminMenu: `🛠️ *Admin Panel*\n\n1️⃣ Pending Requests\n2️⃣ Active Consultations\n3️⃣ Role Approvals\n4️⃣ Doctor Management\n5️⃣ Profile\n6️⃣ View Patient Profiles\n7️⃣ Verify Payment\n8️⃣ Verify Discount\n9️⃣ Message Patient\n🔟 Close Consultation\n11. Add Admin (Super Admin)\n12. Remove Admin (Super Admin)\n\n0️⃣ Switch Role`,
  adminRoleApprovals: `🔐 *Role Approvals*\n\n1️⃣ View Role Applications\n2️⃣ Approve Doctor\n3️⃣ Approve Caregiver\n4️⃣ Approve Support\n\n0️⃣ Back to Menu\n\nReply with number`,
  adminDoctorManagement: `👨⚕️ *Doctor Management*

1️⃣ List Doctors
2️⃣ List Pending Doctors
3️⃣ Assign Doctor
4️⃣ Reassign Doctor
5️⃣ Remove Doctor
6️⃣ Reject Doctor
7️⃣ Message Doctor
8️⃣ Register Doctor
9️⃣ Invite Doctor

0️⃣ Back to Menu

Reply with number`,
  adminAssignDoctorInput: `🔗 *Assign Doctor*\n\nEnter consultation ID and doctor ID:\n\nFormat: CONSULTATION_ID DOCTOR_ID\n\nExample: cons_1234567890 doc_9876543210\n\n0. Back to Menu`,
  adminRemoveDoctorInput: `🗑️ *Remove Doctor*\n\nEnter doctor ID:\n\n0. Back to Menu`,
  adminRejectDoctorInput: `❌ *Reject Doctor*\n\nEnter doctor request ID:\n\n0. Back to Menu`,
  adminMessageDoctorInput: `📩 *Message Doctor*\n\nEnter: DOCTOR_ID MESSAGE\n\nExample: doc_1234567890 Please review case\n\n0. Back to Menu`,
  adminApproveDoctorInput: `👨⚕️ *Approve Doctor*\n\nEnter phone number of doctor to approve:\n\nExample: 9876543210\n\n0. Back to Menu`,
  adminApproveCaregiverInput: `👤 *Approve Caregiver*\n\nEnter patient phone number to approve:\n\n0. Back to Menu`,
  adminApproveSupportInput: `🛎️ *Approve Support*\n\nEnter user phone number to approve:\n\n0. Back to Menu`,
  adminRegisterDoctorInput: `📝 *Register Doctor*\n\nEnter: NAME, SPECIALIZATION, PHONE, CANCERS\n\nExample: John Smith, Medical Oncology, 9876543210, lung,breast\n\n0. Back to Menu`,
  adminVerifyDiscountInput: `📎 *Verify Discount*\n\nEnter: PHONE approved/rejected [reason]\n\nExample: 9876543210 approved\n\n0. Back to Menu`,
  adminVerifyPaymentInput: `💳 *Verify Payment*\n\nEnter transaction ID:\n\nExample: txn_abc123\n\n0. Back to Menu`,
  adminMessagePatientInput: `📩 *Message Patient*\n\nEnter: PHONE MESSAGE\n\nExample: 9876543210 How are you feeling?\n\n0. Back to Menu`,
adminReassignDoctorInput: `🔁 *Reassign Doctor*\n\nEnter: CONSULTATION_ID NEW_DOCTOR_ID\n\nExample: cons_1234567890 doc_9876543210\n\n0. Back to Menu`,
profileRemoveRole: `📝 *Remove Role*\n\nEnter role to remove: doctor/caregiver/support\n\n0. Back to Menu`,
   supportMenu: `👩⚕️ *Support Menu*

1️⃣ My Consultations
2️⃣ Doctor Chat
3️⃣ Patient Chat
4️⃣ Profile

0️⃣ Main Menu

Reply with number`,
   doctorSelect: (doctors) => {
    let text = `👨⚕️ *Select Doctor*\n\n`;
    if (!doctors || doctors.length === 0) {
      text += '_No doctors available for your cancer type._\n\n';
    } else {
      doctors.forEach((d, i) => {
        text += `${i + 1}. Dr. ${d.name} - ${d.specialty}\n`;
      });
    }
    text += '\n0. Back to Menu';
    return text;
  },
  caregiverPatientLink: `📲 *Link to Patient*\n\nEnter the patient's phone number (10 digits):\n\nExample: 9876543210\n\n0. Back to Menu`,
  profileStateMenu: `📍 *Select Your State*\n\nEnter your state:`,
  consultationCompleted: `✅ *Consultation Completed*\n\nThank you for using Oncology Consultation.\n\n1. My Consultations\n2. View Profile\n3. Main Menu`,
  platformTerms: `📋 *Platform Terms & Consent*\n\nBy using this service, you agree:\n\n1. Teleconsultation is NOT emergency care. Call 108 or go to ER for emergencies\n2. Medical data shared ONLY with assigned doctors\n3. Socio-economic documents for discount eligibility (OPT-IN)\n4. Admin reviews discounts at their discretion\n5. Data kept only for consultation period\n\n*For discount eligibility:*\n- You may OPT-IN to share eligibility documents (ration card, Ayushman, etc.)\n- Non-consent = full fee but same medical consultation quality\n- You can request data deletion anytime via /delete\n\n1. ✅ I Agree & Continue\n2. ❌ Disagree - Exit\n\nType 'CANCEL' to exit.`,

  profileLinkedPatients: (patients) => {
    // Deliberately no phone number here - a doctor communicates with
    // patients through the app (reply-to-forward), never a raw contact
    // detail that would let them reach a patient outside it.
    let text = `👥 *Linked Patients*\n\n`;
    if (!patients || patients.length === 0) {
      text += '_No linked patients found._\n';
    } else {
      patients.forEach((p, i) => {
        text += `${i + 1}. ${p.name} - ${p.cancerType || 'unknown'}\n`;
      });
    }
    text += '\nReply to this chat to message your active patient, or 0 to go back.';
    return text;
  },
  profileMyDoctors: (doctors) => {
    let text = `👨⚕️ *My Doctors*\n\n`;
    if (!doctors || doctors.length === 0) {
      text += '_No doctors assigned yet._\n';
    } else {
      doctors.forEach((d, i) => {
        text += `${i + 1}. Dr. ${d.name} - ${d.specialty}\n`;
      });
    }
    text += '\nSelect to message or 0 to go back.';
    return text;
  },
  caregiverMenu: (patientName = 'patient') => `👤 *Caregiver Menu*

Linked to: ${patientName}

1️⃣ My Consultations

2️⃣ 👤 Profile & Roles

0️⃣ Main Menu

Reply with number`,
  adminInviteDoctorInput: `📧 *Invite Doctor*\n\nEnter: NAME, SPECIALIZATION, PHONE, CANCERS\n\nExample: Jane Doe, Surgical Oncology, 9876543210, lung\n\n0. Back to Menu`,

  mobileCollection: `📱 *Phone Verification*\n\nEnter your 10-digit mobile number to continue:\n\nOr type SKIP to skip verification`,

  profileMenu: `👤 *Profile & Roles*\n\n1️⃣ View Profile\n2️⃣ Edit Profile\n3️⃣ Apply for Role\n4️⃣ My Roles\n5️⃣ Remove Role\n\n0️⃣ Back to Menu\n\nReply with number`,

  profileView: (profile, isCaregiver) => {
    let text = `📋 *Your Profile*\n\n`;
    text += `*Name:* ${profile.name || 'Not set'}\n`;
    text += `*Age:* ${profile.age || 'Not set'}\n`;
    text += `*Gender:* ${profile.gender || 'Not set'}\n`;
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

  doctorProfileView: (doctor) => {
    let text = `👨⚕️ *Your Doctor Profile*\n\n`;
    text += `*Name:* ${doctor.name || 'Not set'}\n`;
    text += `*Specialty:* ${doctor.specialty || 'Not set'}\n`;
    text += `*Cancer Types Treated:* ${doctor.cancerTypes?.join(', ') || 'Not set'}\n`;
    text += `*Hospital/Clinic:* ${doctor.hospital || 'Not set'}\n`;
    text += `*City:* ${doctor.city || 'Not set'}\n`;
    text += `*Qualifications:* ${doctor.qualifications?.join(', ') || 'Not set'}\n`;
    text += `*Experience:* ${doctor.experience ? `${doctor.experience} years` : 'Not set'}\n`;
    text += `*Consultation Fee:* ₹${doctor.consultationFee || 1500}\n`;
    text += `\n💡 Reply "MENU" for options.`;
    return text;
  },

  adminProfileView: (admin) => {
    let text = `📋 *Your Admin Profile*\n\n`;
    text += `*Name:* ${admin.name || 'Not set'}\n`;
    text += `*Phone:* ${admin.phoneNumber || 'Not set'}\n`;
    text += `*Role:* ${admin.role || 'Admin'}\n`;
    text += `*Added:* ${admin.addedAt ? new Date(admin.addedAt).toLocaleDateString() : 'Unknown'}\n`;
    text += `\n💡 Reply "EDIT" to modify your profile or "MENU" for options.`;
    return text;
  },

  adminProfileEdit: `✏️ *Edit Admin Profile*\n\nSend your details in this format:\n\`NAME:<your name>\n\nOr reply FIELD:VALUE on separate lines.`,

  profileEdit: `✏️ *Edit Profile*\n\nSend your details in this format:\n\`NAME:<name>\nAGE:<age>\nGENDER:<gender>\nADDRESS:<full address>\nLOCATION:<city>\n\nOr reply FIELD:VALUE on separate lines.`,

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

  doctorMenu: (doctorName, hasActive) => `👨⚕️ *Doctor Menu*\n\nHi ${doctorName}\n1️⃣ Status\n2️⃣ My Patients\n3️⃣ Edit Profile\n4️⃣ Message Admin\n\n${hasActive ? '_Has active consultation_' : ''}\n\n0️⃣ Switch Role`,

  roleSelect: `👤 *Select Your Role*

1️⃣ Patient (need consultation)
2️⃣ Caregiver (helping someone)
3️⃣ Doctor (oncologist)

0️⃣ Cancel

Complete profile after selection.`,

  caregiverAuth: `⚠️ *Caregiver Authorization*\n\nCaregivers can act on behalf of patients with additional acknowledgment.\n\n1️⃣ I am authorized to act on patient's behalf\n2️⃣ I am the patient myself\n\n0️⃣ Cancel\n\nReply with number`,

  cancerTypes: `🔍 *Select Cancer Type*\n\n1️⃣ Lung Cancer\n2️⃣ Breast Cancer\n3️⃣ Prostate Cancer\n4️⃣ Liver Cancer\n5️⃣ Pancreatic\n6️⃣ Ovarian\n7️⃣ Blood Cancer\n8️⃣ Other/General\n\n0️⃣ Cancel\n\nReply with number`,

  billing: `💰 *Consultation Pricing*\n\n• Standard Fee: ₹1500\n• Follow-up: ₹800\n• Report Review: ₹500\nDiscounts are at admin discretion. See discount tiers in admin panel.\n\n1️⃣ Request Payment Link\n2️⃣ Back to Menu\n3️⃣ Apply for Fee Discount\n\nReply with number\n\n💡 Sharing eligibility information qualifies you for discounts at admin discretion.`,

  caregiverConsentAck: `⚠️ *Caregiver Data Sharing Consent*\n\nTo qualify for any discounts, the patient MUST share:\n\n1. Medical eligibility documents (consultation reports, diagnostic reports, medical records)\n2. Socio-economic eligibility documents (if claiming discounted categories)\n\nWithout document sharing, full-fee consultation applies.\n\nOur administrators will review eligibility and determine discounts at their discretion.\n\n1. ✅ I acknowledge and provide consent for discount eligibility\n2. ❌ No consent (proceed without discount eligibility)`,

  paymentRequested: `📩 *Payment Request Sent*\n\nYour admin has been notified. They will review your case and send a payment link with the consultation fee.`,

  confirmPayment: `✅ *Payment Status*\n\n1️⃣ Payment Completed\n2️⃣ Payment Pending\n3️⃣ Back to Menu\n\nReply "1" after making payment`,

  consultation: `📋 *My Consultations*\n\nStart a new consultation or manage existing ones.\n\n1️⃣ Start New Consultation\n2️⃣ Check Payment Status\n3️⃣ Withdraw Consultation\n4️⃣ Back to Menu\n\nReply with number`,

  withdrawalConfirm: `⚠️ *Withdraw Consultation*\n\nThis will cancel your pending consultation. Your data will be saved but you'll need to re-request a consultation.\n\n1️⃣ Yes, withdraw\n2️⃣ No, keep consultation\n\nReply with number`,

  withdrawalSuccess: `✅ *Consultation Withdrawn*\n\nYour pending consultation has been cancelled. All uploaded documents are saved.\nYou can request a new consultation anytime from the main menu.`,

closeConsultationPrompt: `🔚 *Close Consultation*\n\nEnter consultation ID to close:\n\nExample: cons_1234567890\n\n0. Back to Menu`,

   adminMenuIncomplete: `👤 *Admin Profile Required*\n\nYour admin profile is incomplete. Please complete it first.\n\n5️⃣ Profile & Roles\n\n0️⃣ Switch Role\n\nReply with number`,

   discountCategories: `🏛️ *Discount Category Selection*\n\n1️⃣ BPL / EWS\n2️⃣ Ayushman Bharat (PM-JAY)\n3️⃣ e-Shram (Unorganized Sector)\n4️⃣ Farmer\n5️⃣ Defence / Ex-servicemen\n6️⃣ Paramilitary\n7️⃣ Police\n8️⃣ Government Employee\n9️⃣ Freedom Fighter Dependent\n🔟 Senior Citizen / Retiree\n1️⃣1️⃣ Widow / Single Woman\n1️⃣2️⃣ PwD (UDID)\n1️⃣3️⃣ SC/ST\n1️⃣4️⃣ Minority Community\n1️⃣5️⃣ Rural/Tribal Resident\n1️⃣6️⃣ Healthcare Worker\n1️⃣7️⃣ Teacher / Anganwadi\n1️⃣8️⃣ Journalist\n1️⃣9️⃣ No Discount (Full Fee)\n\nReply with number (mandatory document upload required for any selection except 19)`,

  consentsMenu: `📋 *Mandatory Consents*\n\nThese consents are REQUIRED for consultation:\n\n1. ✅ Teleconsultation Consent (required)\n2. ✅ Data Sharing Consent (required)\n3. ✅ DPDP Act Compliance (required)\n\nType 1, 2, 3 to confirm each\nType 'CANCEL' to exit without consenting`,
};

class ConversationFlow {
  constructor(consultationManager, doctorRouter, paymentService, userRegistry = null, adminRegistry = null) {
    this.consultationManager = consultationManager;
    this.doctorRouter = doctorRouter;
    this.paymentService = paymentService;
    this.userRegistry = userRegistry;
    this.adminRegistry = adminRegistry;
  }

getMessageOptions(state, persona = 'patient') {
    switch (state) {
      case FlowStates.WELCOME: return InteractiveMenus.main(persona);
      case FlowStates.ROLE_SELECT: return InteractiveMenus.roleSelect;
      case FlowStates.CAREGIVER_AUTH: return InteractiveMenus.caregiverAuth;
      case FlowStates.CAREGIVER_CONSENT_ACK: return InteractiveMenus.caregiverConsentAck;
      case FlowStates.CONSULTATION: return InteractiveMenus.consultation;
      case FlowStates.CANCER_TYPE: return InteractiveMenus.cancerTypes;
      case FlowStates.BILLING: return InteractiveMenus.billing;
      case FlowStates.REPORT_UPLOAD: return '📎 Send your diagnostic report (image/PDF)';
      case FlowStates.PROFILE_VIEW: return InteractiveMenus.profileMenu;
      case FlowStates.PROFILE_EDIT: return InteractiveMenus.profileEdit;
      case FlowStates.ROLE_APPLICATION: return InteractiveMenus.roleApplication;
      case FlowStates.CONSULTATION_WITHDRAW: return InteractiveMenus.withdrawalConfirm;
      case FlowStates.ADMIN_MENU: return InteractiveMenus.adminMenu;
      case FlowStates.ADMIN_CLOSE_CONSULTATION: return InteractiveMenus.closeConsultationPrompt;
      case FlowStates.ADMIN_ROLE_APPROVALS: return InteractiveMenus.adminRoleApprovals;
      case FlowStates.ADMIN_INVITE_DOCTOR_INPUT: return InteractiveMenus.adminInviteDoctorInput;
      case FlowStates.ADMIN_REGISTER_DOCTOR_INPUT: return InteractiveMenus.adminRegisterDoctorInput;
      case FlowStates.ADMIN_APPROVE_DOCTOR_INPUT: return InteractiveMenus.adminApproveDoctorInput;
      case FlowStates.ADMIN_APPROVE_CAREGIVER_INPUT: return InteractiveMenus.adminApproveCaregiverInput;
      case FlowStates.ADMIN_APPROVE_SUPPORT_INPUT: return InteractiveMenus.adminApproveSupportInput;
      case FlowStates.ADMIN_DOCTOR_MANAGEMENT: return InteractiveMenus.adminDoctorManagement;
      case FlowStates.ADMIN_ASSIGN_DOCTOR_INPUT: return InteractiveMenus.adminAssignDoctorInput;
      case FlowStates.ADMIN_REMOVE_DOCTOR_INPUT: return InteractiveMenus.adminRemoveDoctorInput;
      case FlowStates.ADMIN_REJECT_DOCTOR_INPUT: return InteractiveMenus.adminRejectDoctorInput;
      case FlowStates.ADMIN_VERIFY_DISCOUNT_INPUT: return InteractiveMenus.adminVerifyDiscountInput;
      case FlowStates.ADMIN_VERIFY_PAYMENT_INPUT: return InteractiveMenus.adminVerifyPaymentInput;
      case FlowStates.DOCTOR_PROFILE_EDIT: return `✏️ *Edit Doctor Profile*\n\nSend: SPECIALTY:<value>\nCANCERTYPES:<value>\nHOSPITAL:<value>\nCITY:<value>\nQUALIFICATIONS:<value>\n\n0. Menu`;
      case FlowStates.ADMIN_MESSAGE_PATIENT_INPUT: return InteractiveMenus.adminMessagePatientInput;
      case FlowStates.ADMIN_MESSAGE_DOCTOR_INPUT: return InteractiveMenus.adminMessageDoctorInput;
      case FlowStates.ADMIN_REASSIGN_DOCTOR_INPUT: return InteractiveMenus.adminReassignDoctorInput;
      case FlowStates.PROFILE_REMOVE_ROLE: return InteractiveMenus.profileRemoveRole;
      case FlowStates.PROFILE_DISCOUNT_CATEGORY: return InteractiveMenus.discountCategories;
      case FlowStates.PROFILE_DISCOUNT_DOCUMENTS: return '📎 Please upload eligibility documents for your selected discount category (ration card, Ayushman card, etc.):\n\n0. Skip';
      case FlowStates.DOCTOR_SELECT: return InteractiveMenus.doctorSelect([]);
      case FlowStates.SUPPORT_MENU: return InteractiveMenus.supportMenu;
      case FlowStates.PROFILE_CONSENTS: return InteractiveMenus.consentsMenu;
      case FlowStates.MOBILE_COLLECTION: return InteractiveMenus.mobileCollection;
      case FlowStates.PERSONA_SELECT: return InteractiveMenus.personaSelect(persona);
      default: return InteractiveMenus.main(persona);
    }
  }

  async parseMenuSelection(message, state, phoneNumber, session) {
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

      case FlowStates.MOBILE_COLLECTION:
        return this.handleMobileCollection(phoneNumber, message);

      case FlowStates.SUPPORT_MENU:
        return this.handleSupportMenuSelection(selection, phoneNumber, session);

      case FlowStates.DOCTOR_MENU:
        return this.handleDoctorMenuSelection(selection, phoneNumber, session);

      case FlowStates.CANCER_TYPE:
        return this.handleCancerTypeSelection(selection);
        
      case FlowStates.PLATFORM_TERMS:
        return this.handlePlatformTermsInput(selection, phoneNumber, session);

      case FlowStates.BILLING:
        return this.handleBillingSelection(selection, phoneNumber);

      case FlowStates.PERSONA_SELECT:
        return this.handlePersonaSelection(selection, phoneNumber, session);

      case FlowStates.CONSULTATION:
        return this.handleConsultationMenuSelection(selection, phoneNumber, session);

      case FlowStates.CONSULTATION_WITHDRAW:
        return this.handleWithdrawalConfirmation(selection, phoneNumber, session);

      case FlowStates.ADMIN_CLOSE_CONSULTATION:
        return this.handleAdminCloseConsultation(message, phoneNumber);

      case FlowStates.ADMIN_ROLE_APPROVALS:
        return this.handleAdminRoleApprovalsSelection(selection, phoneNumber, session);

      case FlowStates.ADMIN_INVITE_DOCTOR_INPUT:
        return this.handleAdminInviteDoctorInput(message, phoneNumber, session);

      case FlowStates.ADMIN_REGISTER_DOCTOR_INPUT:
        return this.handleAdminRegisterDoctorInput(message, phoneNumber, session);

      case FlowStates.ADMIN_APPROVE_DOCTOR_INPUT:
        return this.handleAdminApproveDoctorInput(message, phoneNumber, session);

      case FlowStates.ADMIN_APPROVE_CAREGIVER_INPUT:
        return this.handleAdminApproveCaregiverInput(message, phoneNumber, session);

      case FlowStates.ADMIN_APPROVE_SUPPORT_INPUT:
        return this.handleAdminApproveSupportInput(message, phoneNumber, session);

      case FlowStates.ADMIN_DOCTOR_MANAGEMENT:
        return this.handleAdminDoctorManagementSelection(selection, phoneNumber, session);

      case FlowStates.ADMIN_ASSIGN_DOCTOR_INPUT:
        return this.handleAdminAssignDoctorInput(message, phoneNumber, session);

      case FlowStates.ADMIN_REMOVE_DOCTOR_INPUT:
        return this.handleAdminRemoveDoctorInput(message, phoneNumber, session);

      case FlowStates.ADMIN_REJECT_DOCTOR_INPUT:
        return this.handleAdminRejectDoctorInput(message, phoneNumber, session);

      case FlowStates.ADMIN_VERIFY_DISCOUNT_INPUT:
        return this.handleAdminVerifyDiscountInput(message, phoneNumber, session);

      case FlowStates.ADMIN_VERIFY_PAYMENT_INPUT:
        return this.handleAdminVerifyPaymentInput(message, phoneNumber, session);

      case FlowStates.ADMIN_MESSAGE_PATIENT_INPUT:
        return this.handleAdminMessagePatientInput(message, phoneNumber, session);

      case FlowStates.ADMIN_MESSAGE_DOCTOR_INPUT:
        return this.handleAdminMessageDoctorInput(message, phoneNumber, session);

      case FlowStates.ADMIN_REASSIGN_DOCTOR_INPUT:
        return this.handleAdminReassignDoctorInput(message, phoneNumber, session);
     case FlowStates.ADMIN_ADD_ADMIN_INPUT:
       return this.handleAdminAddAdminInput(message, phoneNumber, session);

     case FlowStates.ADMIN_REMOVE_ADMIN_INPUT:
       return this.handleAdminRemoveAdminInput(message, phoneNumber, session);
      case FlowStates.PROFILE_CONSENTS:
        return this.handleProfileConsentsSelection(selection, phoneNumber, session);

      case FlowStates.PROFILE_REMOVE_ROLE:
        return this.handleRemoveRole(message, phoneNumber, session);

      case FlowStates.PROFILE_DISCOUNT_CATEGORY:
        return this.handleDiscountCategorySelection(selection, phoneNumber, session);

      case FlowStates.PROFILE_DISCOUNT_DOCUMENTS:
        return this.handleDiscountDocumentsInput(message, phoneNumber, session);

case FlowStates.DOCTOR_SELECT:
        return this.handleDoctorSelection(selection, phoneNumber, session);

      case FlowStates.REPORT_UPLOAD:
        return {
          nextState: FlowStates.REPORT_UPLOAD,
          response: '📎 Please upload a medical report (image or PDF). Send /menu to go back.'
        };

      case FlowStates.COMPLETED:
        return this.handleConsultationCompleted(selection, phoneNumber);

      case FlowStates.ADMIN_BOOTSTRAP_SECRET:
        return this.handleAdminBootstrapSecret(message, phoneNumber);

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
      '1': FlowStates.CONSULTATION,
      '2': FlowStates.PROFILE_VIEW
    };

    const nextState = flowMap[selection];
    if (nextState) {
      return { 
        nextState, 
        response: this.getMessageOptions(nextState, 'patient')
      };
    }

    return { nextState: FlowStates.WELCOME, response: InteractiveMenus.main() };
  }

  handleRoleSelection(selection, phoneNumber) {
    if (selection === '0' || selection.toLowerCase() === 'cancel') {
      return { nextState: FlowStates.WELCOME, response: InteractiveMenus.main() };
    }
    if (selection === '1') {
      return this.startPatientProfile(phoneNumber);
    } else if (selection === '2') {
      return { nextState: FlowStates.CAREGIVER_AUTH, response: InteractiveMenus.caregiverAuth };
    } else if (selection === '3') {
      return this.startDoctorProfile(phoneNumber);
    } else if (selection === '4') {
      const bootstrapSecret = process.env.BOOTSTRAP_SECRET;
      const hasSuperAdmin = (process.env.SUPER_ADMIN_CHAT_IDS || '').split(',').some(id => id.trim()) ||
                          (process.env.SUPER_ADMIN_PHONES || '').split(',').some(p => p.trim());
      if (!hasSuperAdmin && bootstrapSecret) {
        return {
          nextState: FlowStates.ADMIN_BOOTSTRAP_SECRET,
          response: `🔐 *Admin Bootstrap Required*\n\nNo super admin configured. Provide bootstrap secret to become admin.\n\nReply with the bootstrap secret (or '0' to cancel).`
        };
      }
      return {
        nextState: FlowStates.ROLE_SELECT,
        response: `❌ Admin access is by invitation only.\n\nUse /apply admin to request admin role.\n\n${InteractiveMenus.roleSelect}`
      };
    }
    return { nextState: FlowStates.ROLE_SELECT, response: InteractiveMenus.roleSelect };
  }

  startDoctorProfile(phoneNumber) {
    this.consultationManager.updateSession(phoneNumber, {
      flowState: FlowStates.PROFILE,
      profileStep: 'doctor_name',
      selectedPersona: 'doctor',
      isCaregiver: false
    });
    return {
      nextState: FlowStates.PROFILE,
      response: `👨⚕️ *Doctor Profile - Step 1/3*

Please enter your full name:`
    };
  }

  handleAdminBootstrapSecret(message, phoneNumber) {
    const trimmed = message.trim();
    const bootstrapSecret = process.env.BOOTSTRAP_SECRET;
    
    if (trimmed === '0') {
      return { nextState: FlowStates.ROLE_SELECT, response: InteractiveMenus.roleSelect };
    }
    
    if (!bootstrapSecret || trimmed !== bootstrapSecret) {
      return {
        nextState: FlowStates.WELCOME,
        response: `❌ Invalid bootstrap secret. Admin access denied.\n\n${InteractiveMenus.roleSelect}`
      };
    }
    
    const hasSuperAdmin = (process.env.SUPER_ADMIN_CHAT_IDS || '').split(',').some(id => id.trim()) ||
                          (process.env.SUPER_ADMIN_PHONES || '').split(',').some(p => p.trim());
    
    if (hasSuperAdmin) {
      return {
        nextState: FlowStates.WELCOME,
        response: `❌ Bootstrap already complete. Super admin configured in .env.\n\n${InteractiveMenus.roleSelect}`
      };
    }
    
    this.userRegistry?.createUser(phoneNumber);
    this.userRegistry?.approveRole(phoneNumber, 'super_admin', 'bootstrap');
    this.adminRegistry?.addAdmin(phoneNumber, 'bootstrap', phoneNumber, 'super_admin');
    
    const { clearCache } = require('../models/persona');
    clearCache();
    
    this.consultationManager.updateSession(phoneNumber, { flowState: FlowStates.ADMIN_MENU });
    return {
      nextState: FlowStates.ADMIN_MENU,
      response: `✅ *Admin profile created (bootstrap)*\n\n${InteractiveMenus.adminMenu}`
    };
  }

  handleCaregiverAuthSelection(selection, phoneNumber) {
    if (selection === '0') {
      return { nextState: FlowStates.ROLE_SELECT, response: InteractiveMenus.roleSelect };
    }
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
    if (selection === '2') {
      return this.startPatientProfile(phoneNumber);
    }
    return { nextState: FlowStates.CAREGIVER_AUTH, response: `❌ Invalid selection.\n\n${InteractiveMenus.caregiverAuth}` };
  }

  handleCaregiverPatientLink(phoneNumber, message, session) {
    const patientPhone = message.trim();
    
    if (!patientPhone || !patientPhone.match(/^\d{10}$/)) {
      return {
        nextState: FlowStates.CAREGIVER_PATIENT_LINK,
        response: `📲 *Link to Patient*\n\nEnter the patient's phone number (10 digits):\n\nExample: 9876543210\n\n0. Back to Menu`
      };
    }
    
    if (patientPhone === '0') {
      return {
        nextState: FlowStates.WELCOME,
        response: InteractiveMenus.main('caregiver')
      };
    }
    
    this.consultationManager.updateSession(phoneNumber, {
      linkedPatientPhone: patientPhone
    });
    
    const linkedSession = this.consultationManager.getSession(patientPhone);
    const patientName = linkedSession?.patientProfile?.name || 'patient';

    this.consultationManager.updateSession(phoneNumber, { flowState: FlowStates.CAREGIVER_MENU });
    return {
      nextState: FlowStates.CAREGIVER_MENU,
      response: InteractiveMenus.caregiverMenu(patientName)
    };
  }

  handleCaregiverMenuSelection(selection, phoneNumber, session) {
    const flowMap = {
      '1': () => ({ nextState: FlowStates.CONSULTATION, response: InteractiveMenus.consultation }),
      '2': () => ({ nextState: FlowStates.PROFILE_VIEW, response: InteractiveMenus.profileMenu }),
      '0': () => ({ nextState: FlowStates.WELCOME, response: InteractiveMenus.main('patient') })
    };
    
    const handler = flowMap[selection];
    if (handler) {
      return handler();
    }
    return { nextState: FlowStates.CAREGIVER_MENU, response: InteractiveMenus.caregiverMenu(session?.patientName) };
  }

  handleSupportMenuSelection(selection, phoneNumber, session) {
    const flowMap = {
      '1': () => this.getActiveConsultationsForSupport(phoneNumber),
      '2': () => ({ nextState: FlowStates.ADMIN_MESSAGE_DOCTOR_INPUT, response: InteractiveMenus.adminMessageDoctorInput }),
      '3': () => ({ nextState: FlowStates.ADMIN_MESSAGE_PATIENT_INPUT, response: InteractiveMenus.adminMessagePatientInput }),
      '4': () => ({ nextState: FlowStates.PROFILE_VIEW, response: InteractiveMenus.profileMenu }),
      '0': () => ({ nextState: FlowStates.WELCOME, response: InteractiveMenus.main('support') })
    };
    const handler = flowMap[selection];
    if (handler) return handler();
    return { nextState: FlowStates.SUPPORT_MENU, response: InteractiveMenus.supportMenu };
  }

  // Support has 'view_all' permission over consultations (not a personal
  // one like patients do), so "My Consultations" must list everyone's
  // active consultations rather than routing into the patient-personal
  // FlowStates.CONSULTATION flow, which requires (and would block on) a
  // patientProfile support agents don't have.
  getActiveConsultationsForSupport(phoneNumber) {
    // No patient contact info here either - support relays via MSG_PATIENT/
    // MSG_DOCTOR (app-mediated), not by reaching out directly.
    const active = Array.from(this.consultationManager.consultations.values())
      .filter(c => c.status === 'active');
    let text = `📊 *Active Consultations*\n\n`;
    if (active.length === 0) {
      text += `_No active consultations_\n`;
    } else {
      active.forEach(c => {
        text += `• ${c.id} - Dr. ${c.doctorId || 'unassigned'}\n`;
      });
    }
    return {
      nextState: FlowStates.SUPPORT_MENU,
      response: text + `\n${InteractiveMenus.supportMenu}`
    };
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
    } else {
      this.consultationManager.updateSession(phoneNumber, {
        caregiverConsentGiven: true
      });
    }

    return {
      nextState: FlowStates.CAREGIVER_PATIENT_LINK,
      response: InteractiveMenus.caregiverPatientLink
    };
  }

  async handleConsultationMenuSelection(selection, phoneNumber, session) {
    if (selection === '1') {
      return this.handleStartConsultation(phoneNumber, session);
    } else if (selection === '2') {
      return this.handlePaymentStatusCheck(phoneNumber, session);
    } else if (selection === '3') {
      return this.handleWithdrawalRequest(phoneNumber, session);
    } else if (selection === '4') {
      return { nextState: FlowStates.WELCOME, response: InteractiveMenus.main() };
    }
    return { nextState: FlowStates.CONSULTATION, response: `❌ Invalid selection.\n\n${InteractiveMenus.consultation}` };
  }

  async handleStartConsultation(phoneNumber, session) {
    const effectiveSession = (session?.isCaregiver && session?.linkedPatientPhone)
      ? { ...session, ...this.consultationManager.getSession(session.linkedPatientPhone) }
      : session;
    const hasCancerType = effectiveSession?.patientProfile?.cancerType || effectiveSession?.cancerType;
    const hasReports = effectiveSession?.media?.length > 0 || effectiveSession?.patientProfile?.medicalReports?.length > 0;
    
    if (!hasCancerType) {
      return {
        nextState: FlowStates.CANCER_TYPE,
        response: InteractiveMenus.cancerTypes
      };
    }
    
    if (!hasReports) {
      return {
        nextState: FlowStates.REPORT_UPLOAD,
        response: '📎 Please upload at least one medical report (biopsy, imaging, discharge summary):'
      };
    }
    
    return {
      nextState: FlowStates.BILLING,
      response: InteractiveMenus.billing
    };
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
      // Nothing else in the live codebase ever creates a Consultation
      // record from the patient-facing flow (the function that used to do
      // this automatically, handleConsultationRequest, has no callers; the
      // manual-pick alternative, handleDoctorSelection, is dispatched only
      // from DOCTOR_SELECT, which nothing ever transitions into either) - so
      // payment verification silently dead-ended, and admin's "Assign
      // Doctor" had nothing to ever assign to. Create it here as pending
      // (no doctor yet), matching getPendingForAdmin()'s own definition
      // (status active, doctorId unset) so it surfaces in Pending Requests
      // for the admin to assign a doctor to - the actual designed workflow,
      // per the admin-driven assign/reassign/notify features already built.
      if (!session.consultationId) {
        this.consultationManager.updateSession(phoneNumber, { paymentVerified: true });
        const updatedSession = this.consultationManager.getSession(phoneNumber);
        this.consultationManager.createConsultation(phoneNumber, null, updatedSession);
      }
      return {
        nextState: FlowStates.CONSULTATION,
        response: `✅ Payment verified! Your consultation request has been sent to the admin, who will assign you a specialist shortly.`,
        data: {}
      };
    }

    return {
      nextState: FlowStates.CONSULTATION,
      response: `⏳ Payment pending. Please complete your payment to connect.\n\nAmount: ₹${payment?.amount || 'TBD'}`,
      data: {}
    };
  }

  handlePlatformTermsInput(selection, phoneNumber, session) {
    if (selection === '1') {
      const profile = session?.patientProfile || {};
      profile.platformTermsAccepted = true;
      this.consultationManager.updateSession(phoneNumber, { patientProfile: profile });
      
      // Check if already has completed profile OR existing patient data
      const profileComplete = session?.profileStep === 'completed';
      const hasExistingProfile = session?.patientProfile && 
        (session.patientProfile.name || session.patientProfile.selectedPersona);
      
      // If user already has profile data, skip role selection and go to main menu
      if (profileComplete || hasExistingProfile) {
        const savedPersona = session?.selectedPersona || 'patient';
        return {
          nextState: FlowStates.WELCOME,
          response: `✅ Platform terms accepted.\n\n${this.getGreeting(phoneNumber)}`
        };
      }
      return {
        nextState: FlowStates.ROLE_SELECT,
        response: `👤 *Profile Required*\n\nComplete your profile to access consultation services.\n\n${InteractiveMenus.roleSelect}`
      };
    }
    if (selection === '2' || selection.toLowerCase() === 'cancel') {
      this.consultationManager.resetSession(phoneNumber);
      return {
        nextState: FlowStates.WELCOME,
        response: `❌ You must agree to platform terms to use this service.\n\nType /start to try again.`
      };
    }
    return { nextState: FlowStates.PLATFORM_TERMS, response: InteractiveMenus.platformTerms };
  }

  handleAdminFallback(phoneNumber, message) {
    const session = this.consultationManager.getSession(phoneNumber);
    
    return {
      nextState: FlowStates.ADMIN_FALLBACK,
      response: `👨⚕️ Admin has been notified. They will connect you to an available oncologist shortly.\nYour patient ID: ${phoneNumber}`,
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
    if (selection === '0') {
      return { nextState: FlowStates.WELCOME, response: InteractiveMenus.main() };
    }
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
      // "Request Payment Link" never actually created a payment transaction -
      // session.paymentTransaction stayed null forever, which meant
      // /feebased ("No pending payment request found"), the menu-driven
      // Verify Payment flow, and handlePaymentStatusCheck could never work
      // for this patient at all. amount 0 marks the transaction feePending
      // (admin determines the real fee at their discretion, same as the
      // discount flow's own design), matching what handlePaymentStatusCheck
      // already expects to see.
      const paymentInfo = this.paymentService?.generatePaymentLinkSync
        ? this.paymentService.generatePaymentLinkSync(phoneNumber, 0, 0)
        : { transactionId: `txn_${Date.now()}` };
      this.consultationManager.updateSession(phoneNumber, { paymentTransaction: paymentInfo.transactionId });
      return {
        nextState: FlowStates.PAYMENT_PENDING,
        response: InteractiveMenus.paymentRequested,
        data: { paymentRequested: true, summary: this.getPaymentRequestSummary(phoneNumber) }
      };
    }
    if (selection === '2') {
      return { nextState: FlowStates.WELCOME, response: InteractiveMenus.main() };
    }
    if (selection === '3') {
      return { nextState: FlowStates.PROFILE_DISCOUNT_CATEGORY, response: InteractiveMenus.discountCategories };
    }
    return { nextState: FlowStates.BILLING, response: `❌ Invalid selection.\n\n${InteractiveMenus.billing}` };
  }

  async createFlowHandler(phoneNumber, message) {
    const session = this.consultationManager.getSession(phoneNumber);
    // A caregiver acting on behalf of a linked patient never fills out their
    // own patientProfile (the patient already has one) - checking session
    // directly would permanently lock them out of Consultation/Billing
    // regardless of how complete the LINKED PATIENT's profile is. Mirror the
    // same effective-session merge used by handleStartConsultation/
    // getPaymentRequestSummary/etc. for this completeness/consent check.
    const completenessCheckSession = (session?.isCaregiver && session?.linkedPatientPhone)
      ? { ...session, ...this.consultationManager.getSession(session.linkedPatientPhone) }
      : session;
    const profileComplete = this.isProfileComplete(completenessCheckSession);
    const currentState = session.flowState || FlowStates.WELCOME;

    const platformTermsAccepted = session?.patientProfile?.platformTermsAccepted || false;
    if (!platformTermsAccepted && currentState === FlowStates.WELCOME) {
      return {
        nextState: FlowStates.PLATFORM_TERMS,
        response: InteractiveMenus.platformTerms
      };
    }

    // Profile-incomplete guard: only intercept when the user's input is NOT a
    // valid main-menu option. Valid options ('1'/'2'/'0'/cancel) fall through
    // to handleWelcomeSelection so its own validation governs; garbage stays
    // at WELCOME (re-showing the main menu) instead of being silently
    // advanced to Role Select. The consultation lock further down still blocks
    // '1' (My Consultations) until the profile is complete.
    if (!profileComplete && currentState === FlowStates.WELCOME) {
      const trimmed = message.trim();
      const validWelcome = ['1', '2', '0'].includes(trimmed) || trimmed.toLowerCase() === 'cancel';
      if (!validWelcome) {
        return {
          nextState: FlowStates.WELCOME,
          response: `👤 *Profile Required*\n\nComplete your profile to access consultation services.\n\n${InteractiveMenus.main()}`
        };
      }
    }

    // Lock consultation flow if profile incomplete or consents not confirmed
    const consentsConfirmed = completenessCheckSession?.patientProfile?.confirmedConsents?.teleconsultation &&
      completenessCheckSession?.patientProfile?.confirmedConsents?.dataSharing &&
      completenessCheckSession?.patientProfile?.confirmedConsents?.dpdp;
    if ((!profileComplete || !consentsConfirmed) && ['cancer_type', 'billing', 'report_upload', 'consultation'].includes(currentState)) {
      return {
        nextState: FlowStates.WELCOME,
        response: `⚠️ *Profile Incomplete*\n\nPlease complete your profile first:\n• Name: ${completenessCheckSession.patientProfile?.name ? '✅' : '❌'}\n• Age: ${completenessCheckSession.patientProfile?.age ? '✅' : '❌'}\n• Gender: ${completenessCheckSession.patientProfile?.gender ? '✅' : '❌'}\n• Cancer Type: ${completenessCheckSession.patientProfile?.cancerType ? '✅' : '❌'}\n• Medical Reports: ${completenessCheckSession.patientProfile?.medicalReports?.length > 0 ? '✅' : '❌'}\n\nUse option 2 (Profile & Roles) to update.`
      };
    }

    if (currentState === FlowStates.PROFILE) {
      return this.handleProfileInput(phoneNumber, message, session);
    }

    if (currentState === FlowStates.ADMIN_PROFILE_EDIT) {
      return this.handleAdminProfileEditInput(phoneNumber, message, session);
    }

    if (currentState === FlowStates.DOCTOR_PROFILE_EDIT) {
      return this.handleDoctorProfileEditInput(phoneNumber, message, session);
    }

    if (currentState === FlowStates.DOCTOR_MSG_ADMIN_INPUT) {
      return this.handleDoctorMsgAdminInput(phoneNumber, message, session);
    }

    if (currentState === FlowStates.PAYMENT_PENDING) {
      return {
        nextState: FlowStates.PAYMENT_PENDING,
        response: `⏳ Payment link has been sent to your admin. You will receive it shortly.\n\n0. Back to Menu`,
        data: {}
      };
    }

    const flowResult = await this.parseMenuSelection(message, currentState, phoneNumber, session);

    if (flowResult.data?.cancerType) {
      this.consultationManager.updateSession(phoneNumber, {
        cancerType: flowResult.data.cancerType
      });
    }

    return flowResult;
  }

  getPaymentRequestSummary(phoneNumber) {
    const session = this.consultationManager.getSession(phoneNumber);
    const effectiveSession = (session?.isCaregiver && session?.linkedPatientPhone)
      ? { ...session, ...this.consultationManager.getSession(session.linkedPatientPhone) }
      : session;
    return {
      phoneNumber,
      name: effectiveSession.patientProfile?.name || 'Not provided',
      cancerType: effectiveSession.cancerType || 'Not selected',
      mediaCount: effectiveSession.media?.length || 0,
      consultationCount: Array.from(this.consultationManager.consultations.values())
        .filter(c => c.patientPhone === phoneNumber).length,
      dataSharingConsent: effectiveSession.patientProfile?.dataSharingConsent || false,
      isCaregiver: session.isCaregiver || false
    };
  }

isProfileComplete(session) {
     const p = session.patientProfile;
     const c = p?.confirmedConsents || {};
     if (!p) return false;
     // Medical reports are collected via uploads after profile completion
     return !!(p.name && p.age && p.gender && p.address && p.state &&
       p.cancerType && p.treatingHospital && p.treatmentStatus &&
       p.emergencyContactName && p.emergencyContactNumber && p.emergencyContactRelation &&
       c.teleconsultation && c.dataSharing && c.dpdp);
   }

   isDoctorProfileComplete(chatId) {
     const doctors = this.doctorRouter?.persistence?.getDoctors() || [];
     const doctor = doctors.find(d => d.telegramId === String(chatId) || String(d.phoneNumber).replace('+', '') === String(chatId));
     if (!doctor) return false;
     return !!(doctor.name && doctor.specialty && doctor.cancerTypes && doctor.cancerTypes.length > 0);
   }

   isSupportProfileComplete(chatId) {
     return this.adminRegistry?.isAdminProfileComplete(chatId);
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

    return `👋 *Welcome back!*\n\n📅 Last consultation: ${dateStr}\n📋 Status: ${statusLabel}\n👨⚕️ Doctor: Dr. ${last.doctorId || 'TBD'}\n\n${InteractiveMenus.main()}`;
  }

  handleMobileCollection(phoneNumber, message) {
    const trimmed = message.trim();
    
    if (trimmed === '0' || trimmed.toLowerCase() === 'skip') {
      this.consultationManager.updateSession(phoneNumber, { mobileSkipped: true });
      return {
        nextState: FlowStates.ROLE_SELECT,
        response: InteractiveMenus.roleSelect
      };
    }
    
    const phoneMatch = trimmed.match(/^\d{10}$/);
    if (phoneMatch) {
      this.consultationManager.updateSession(phoneNumber, { phoneNumber: trimmed });
      return {
        nextState: FlowStates.ROLE_SELECT,
        response: InteractiveMenus.roleSelect
      };
    }
    
    return {
      nextState: FlowStates.MOBILE_COLLECTION,
      response: InteractiveMenus.mobileCollection
    };
  }

  handleProfileInput(phoneNumber, message, session) {
    const step = session.profileStep;
    const trimmed = message.trim();

    // Allow cancel at any profile step
    if (trimmed.toLowerCase() === 'cancel' || trimmed === '0') {
      const result = this.consultationManager.resetSession(phoneNumber);
      const doctorNote = result.doctorId ? `\nDoctor ${result.doctorId} has been released.` : '';
      return {
        nextState: FlowStates.WELCOME,
        response: `❌ Profile cancelled.\n${doctorNote}\n\n${InteractiveMenus.roleSelect}`
      };
    }

    if (!trimmed) {
      return { nextState: FlowStates.PROFILE, response: 'Please provide a valid input.', data: {} };
    }

    const profile = session.patientProfile || {};
    let nextStep = null;
    let nextPrompt = '';

    switch (step) {
      case 'doctor_name':
        profile.name = trimmed;
        nextStep = 'doctor_specialty';
        nextPrompt = 'Enter your specialty (e.g., lung, breast, general):';
        break;
      case 'doctor_specialty':
        const specialties = trimmed.toLowerCase().split(',').map(s => s.trim());
        profile.specialty = specialties;
        nextStep = 'doctor_cancer_types';
        nextPrompt = 'Enter cancer types you treat (comma-separated, e.g., lung,breast,general):';
        break;
      case 'doctor_cancer_types':
        profile.cancerTypes = trimmed.toLowerCase().split(',').map(c => c.trim());
        nextStep = 'doctor_hospital';
        nextPrompt = '🏥 Enter your hospital/clinic name (mandatory):';
        break;
      case 'doctor_hospital':
        profile.doctorHospital = trimmed;
        nextStep = 'doctor_city';
        nextPrompt = '📍 Enter your city (mandatory):';
        break;
      case 'doctor_city':
        profile.doctorCity = trimmed;
        nextStep = 'doctor_qualifications';
        nextPrompt = '🎓 Enter your qualifications (comma-separated, e.g., MBBS, MD Oncology):';
        break;
      case 'doctor_qualifications':
        profile.doctorQualifications = trimmed.split(',').map(q => q.trim()).filter(q => q);
        this.consultationManager.updateSession(phoneNumber, {
          patientProfile: profile,
          flowState: FlowStates.DOCTOR_MENU
        });
        const doctor = {
          id: `doc_${Date.now()}`,
          telegramId: phoneNumber,
          name: profile.name,
          specialty: profile.specialty?.[0] || 'general',
          cancerTypes: profile.cancerTypes || [],
          hospital: profile.doctorHospital || '',
          city: profile.doctorCity || '',
          qualifications: profile.doctorQualifications || []
        };
        this.consultationManager.doctorRouter?.persistence?.addDoctor(doctor);
        return {
          nextState: FlowStates.DOCTOR_MENU,
          response: `✅ Doctor profile created.

Use option 1 to view your assigned patients.`
        };
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
        nextStep = 'address';
        nextPrompt = '🏠 Please enter your full address (mandatory):';
        break;
      case 'address':
        profile.address = trimmed;
        nextStep = 'pincode';
        nextPrompt = '📮 Please enter your 6-digit pin code (mandatory):';
        break;
      case 'pincode':
        if (!trimmed.match(/^\d{6}$/)) {
          return { nextState: FlowStates.PROFILE, response: '❌ Invalid pincode. Enter 6-digit pincode:', data: {} };
        }
        profile.pinCode = trimmed;
        nextStep = 'state';
        nextPrompt = '📍 Please enter your state (mandatory):';
        break;
      case 'state':
        profile.state = trimmed;
        nextStep = 'cancer_type';
        nextPrompt = InteractiveMenus.cancerTypes;
        break;
      case 'diagnosis_date':
        profile.diagnosisDate = trimmed === '0' ? null : trimmed;
        nextStep = 'oncologist_name';
        nextPrompt = '👨⚕️ Enter your primary oncologist name:\n\n0. Skip';
        break;
      case 'cancer_type':
        const cancerMap = { '1': 'lung', '2': 'breast', '3': 'prostate', '4': 'liver', '5': 'pancreatic', '6': 'ovarian', '7': 'blood', '8': 'general' };
        if (!cancerMap[trimmed]) {
          return { nextState: FlowStates.PROFILE, response: InteractiveMenus.cancerTypes, data: {} };
        }
        profile.cancerType = cancerMap[trimmed];
        nextStep = 'diagnosis_date';
        nextPrompt = '📅 Enter diagnosis date (DD/MM/YYYY):\n\n0. Skip';
        break;
      case 'oncologist_name':
        profile.oncologistName = trimmed === '0' ? null : trimmed;
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
        nextPrompt = '👪 Please enter your relationship to the patient (mandatory):';
        break;
      case 'emergency_contact_relation':
        profile.emergencyContactRelation = trimmed;
        // Go straight to 'completed', which routes to the real consents
        // screen (FlowStates.PROFILE_CONSENTS / handleProfileConsentsSelection).
        // A prior version stopped at an intermediate 'consents' step that
        // showed the same consent menu but discarded whatever the user
        // replied with, wasting a turn before the real prompt.
        nextStep = 'completed';
        nextPrompt = '';
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
      // After profile completion for caregivers, prompt for patient link
      if (session.isCaregiver && !session.linkedPatientPhone) {
        return {
          nextState: FlowStates.CAREGIVER_PATIENT_LINK,
          response: InteractiveMenus.caregiverPatientLink
        };
      }
      // Show mandatory consents menu
      return {
        nextState: FlowStates.PROFILE_CONSENTS,
        response: InteractiveMenus.consentsMenu
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
     const effectiveSession = (session?.isCaregiver && session?.linkedPatientPhone)
       ? { ...session, ...this.consultationManager.getSession(session.linkedPatientPhone) }
       : session;
     
     // Check profile completeness before starting consultation
     if (!this.isProfileComplete(effectiveSession)) {
       return {
         nextState: FlowStates.CONSULTATION,
         response: `⚠️ *Profile Incomplete*\n\nComplete your profile first before starting a consultation.\n\nUse option 2 (Profile & Roles) to update.\n\n${InteractiveMenus.consultation}`,
         data: {}
       };
     }
     
     const isVerified = effectiveSession.paymentTransaction && 
       await this.paymentService.verifyPayment(effectiveSession.paymentTransaction);
    
    if (!isVerified) {
      return {
        nextState: FlowStates.CONSULTATION,
        response: `💳 Payment required to start consultation.\n\nType 'PAYMENT' from the menu to request a payment link.\nUploaded docs: ${effectiveSession.media?.length || 0}`,
        data: {}
      };
    }

    const doctor = await this.doctorRouter.findAvailableDoctor(effectiveSession.cancerType);
    if (!doctor) {
      return {
        nextState: FlowStates.CONSULTATION,
        response: `⏳ No doctors available at the moment. Please try again later.`,
        data: {}
      };
    }

    this.consultationManager.updateSession(phoneNumber, { paymentVerified: true });
    const consultation = this.consultationManager.createConsultation(phoneNumber, doctor.id, effectiveSession);

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
      '5': () => ({ nextState: FlowStates.PROFILE_REMOVE_ROLE, response: InteractiveMenus.profileRemoveRole }),
      '0': () => this.routeToRoleHome(phoneNumber, this.getCurrentEffectiveRole(phoneNumber, session), session)
    };

    const handler = flowMap[selection];
    if (handler) {
      return handler();
    }
    return { nextState: FlowStates.PROFILE_VIEW, response: InteractiveMenus.profileMenu };
  }

  handleRemoveRole(message, phoneNumber, session) {
    const role = message.trim().toLowerCase();
    if (role === '0' || role === 'cancel') {
      return { nextState: FlowStates.PROFILE_VIEW, response: InteractiveMenus.profileMenu };
    }
    if (!['doctor', 'caregiver', 'support'].includes(role)) {
      return { nextState: FlowStates.PROFILE_REMOVE_ROLE, response: `❌ Invalid role. Use: doctor/caregiver/support\n\n0. Back to Menu` };
    }
    const user = this.userRegistry?.getUser(phoneNumber);
    if (user && this.userRegistry?.revokeRole) {
      this.userRegistry.revokeRole(phoneNumber, role);
      return {
        nextState: FlowStates.PROFILE_VIEW,
        response: `✅ Role '${role}' removed.\n\n${InteractiveMenus.profileMenu}`
      };
    }
    return { nextState: FlowStates.PROFILE_VIEW, response: InteractiveMenus.profileMenu };
  }

  handleSwitchRole(phoneNumber, session) {
    const user = this.userRegistry?.getUser(phoneNumber) || this.userRegistry?.getUserByPhone(phoneNumber);
    const approvedRoles = user?.approvedRoles || [];
    let roleText = '👤 *Switch Role*\n\nApproved roles:\n';
    approvedRoles.forEach(r => {
      roleText += `• ${r}\n`;
    });
    if (approvedRoles.length === 0) {
      roleText += '• _No approved roles_\n';
    }
    roleText += '\nSelect role to switch to:\n';
    approvedRoles.forEach((r, i) => {
      roleText += `${i + 1}. ${r === 'doctor' ? 'Doctor Mode' : r === 'caregiver' ? 'Caregiver Mode' : 'Support Mode'}\n`;
    });
    roleText += '0. Back to Menu';
    return {
      nextState: FlowStates.PROFILE_VIEW,
      response: roleText
    };
  }

  // Shared by handlePersonaSelection and any other "back to my menu" exit
  // point reachable from more than one role (e.g. Profile & Roles), so
  // cancelling out never dumps a non-patient role onto the generic patient
  // WELCOME screen instead of their own home menu.
  routeToRoleHome(phoneNumber, role, session) {
    const sess = session || this.consultationManager.getSession(phoneNumber);
    // isCaregiver must track the CURRENT operating mode, not a permanent
    // identity - every caregiver/patient-data merge downstream
    // (handleStartConsultation, getPaymentRequestSummary,
    // handleConsultationRequest, handleDoctorSelection) gates on
    // isCaregiver && linkedPatientPhone together. Entering Caregiver Mode
    // via Switch Role (as opposed to the original CAREGIVER_AUTH onboarding
    // flow) never set isCaregiver, which would silently use this user's own
    // (irrelevant) session data instead of the linked patient's. Just as
    // importantly, switching AWAY from Caregiver Mode must clear it again,
    // or a stale isCaregiver: true would bleed a leftover linkedPatientPhone
    // into e.g. Patient Mode for someone who holds both roles.
    if (role === 'caregiver' && !sess?.isCaregiver) {
      this.consultationManager.updateSession(phoneNumber, { isCaregiver: true });
    } else if (role !== 'caregiver' && sess?.isCaregiver) {
      this.consultationManager.updateSession(phoneNumber, { isCaregiver: false });
    }

    switch (role) {
      case 'caregiver': {
        return sess?.linkedPatientPhone
          ? { nextState: FlowStates.CAREGIVER_MENU, response: InteractiveMenus.caregiverMenu(sess.patientName) }
          : { nextState: FlowStates.CAREGIVER_PATIENT_LINK, response: InteractiveMenus.caregiverPatientLink };
      }
      case 'doctor': {
        const doctors = this.doctorRouter?.persistence?.getDoctors() || [];
        const doctor = doctors.find(d => d.telegramId === String(phoneNumber) || String(d.phoneNumber).replace('+', '') === String(phoneNumber));
        const hasActive = !!doctor && Array.from(this.consultationManager.consultations.values())
          .some(c => c.doctorId === doctor.id && c.status === 'active');
        return { nextState: FlowStates.DOCTOR_MENU, response: InteractiveMenus.doctorMenu(doctor?.name || 'Doctor', hasActive) };
      }
case 'admin':
       case 'super_admin':
         const adminProfileComplete = this.adminRegistry?.isAdminProfileComplete(phoneNumber);
         return {
           nextState: FlowStates.ADMIN_MENU,
           response: adminProfileComplete
             ? InteractiveMenus.adminMenu
             : InteractiveMenus.adminMenuIncomplete
         };
case 'support': {
         const adminProfileComplete = this.adminRegistry?.isAdminProfileComplete(phoneNumber);
         return {
           nextState: FlowStates.SUPPORT_MENU,
           response: adminProfileComplete
             ? InteractiveMenus.supportMenu
             : `⚠️ *Profile Required*\n\nComplete your profile first. Contact admin to set your name.\n\n${InteractiveMenus.supportMenu}`
         };
       }
      default:
        return { nextState: FlowStates.WELCOME, response: InteractiveMenus.main(role) };
    }
  }

  // Same effective-role precedence telegramBot.js's getEffectiveRole uses:
  // an explicit, still-authorized selectedPersona wins, else the identity's
  // natural precedence winner.
  getCurrentEffectiveRole(phoneNumber, session) {
    const { UserPersona, getAvailableRoles } = require('../models/persona');
    const persona = new UserPersona(phoneNumber);
    const selected = session?.selectedPersona;
    const availableRoles = getAvailableRoles(phoneNumber);
    if (selected && availableRoles.includes(selected)) {
      return selected;
    }
    // Self-declared caregivers (CAREGIVER_AUTH, not yet admin-approved) are
    // tracked purely via session.isCaregiver, not userRegistry.approvedRoles
    // - identifyPersona() would never resolve these as 'caregiver' on its
    // own, so check the session flag before falling back to persona.type.
    if (session?.isCaregiver) {
      return 'caregiver';
    }
    return persona.type;
  }

  handlePersonaSelection(selection, phoneNumber, session) {
    const { getAvailableRoles } = require('../models/persona');
    const availableRoles = getAvailableRoles(phoneNumber);

    if (selection === '0' || selection.toLowerCase() === 'cancel') {
      const currentRole = this.getCurrentEffectiveRole(phoneNumber, session);
      return this.routeToRoleHome(phoneNumber, currentRole, session);
    }

    const roleMap = {
      '1': 'patient',
      '2': availableRoles.includes('caregiver') ? 'caregiver' : null,
      '3': availableRoles.includes('doctor') ? 'doctor' : null,
      '4': availableRoles.includes('super_admin') ? 'super_admin' : (availableRoles.includes('admin') ? 'admin' : null),
      '5': availableRoles.includes('support') ? 'support' : null
    };

    const newPersona = roleMap[selection];
    if (!newPersona) {
      const roleNames = { '2': 'Caregiver', '3': 'Doctor', '4': 'Admin', '5': 'Support' };
      return {
        nextState: FlowStates.PERSONA_SELECT,
        response: `❌ You do not have *${roleNames[selection] || 'this'}* role approved.\n\n${InteractiveMenus.personaSelect(session?.selectedPersona, availableRoles)}`
      };
    }

    this.consultationManager.updateSession(phoneNumber, { selectedPersona: newPersona });

    // Route straight into the chosen role's actual menu, not just the
    // (role-agnostic) patient main menu InteractiveMenus.main() renders.
    return this.routeToRoleHome(phoneNumber, newPersona, this.consultationManager.getSession(phoneNumber));
  }

  handleViewProfile(phoneNumber, session) {
    const effectiveRole = this.getCurrentEffectiveRole(phoneNumber, session);
    
    // Admin/Super Admin profile view - shows admin-specific fields
    if (effectiveRole === 'admin' || effectiveRole === 'super_admin') {
      const admin = this.adminRegistry?.getAdmin(phoneNumber);
      return {
        nextState: FlowStates.PROFILE_VIEW,
        response: InteractiveMenus.adminProfileView(admin || {})
      };
    }
    
    // Show the profile matching whichever mode they're currently operating
    // in (not just "are they a doctor at all"), so someone who holds both
    // a doctor record and a patient profile sees the right one depending on
    // which Switch Role mode they're actually in.
    if (effectiveRole === 'doctor') {
      const doctors = this.doctorRouter?.persistence?.getDoctors() || [];
      const doctor = doctors.find(d => d.telegramId === String(phoneNumber) || String(d.phoneNumber).replace('+', '') === String(phoneNumber));
      if (doctor) {
        return {
          nextState: FlowStates.PROFILE_VIEW,
          response: InteractiveMenus.doctorProfileView(doctor)
        };
      }
    }
    const profile = session?.patientProfile || {};
    const isCaregiver = session?.isCaregiver || false;
    return {
      nextState: FlowStates.PROFILE_VIEW,
      response: InteractiveMenus.profileView(profile, isCaregiver)
    };
  }

  handleEditProfile(phoneNumber) {
    const session = this.consultationManager?.getSession(phoneNumber);
    const effectiveRole = this.getCurrentEffectiveRole(phoneNumber, session);

    // Admin/Super Admin profile edit
    if (effectiveRole === 'admin' || effectiveRole === 'super_admin') {
      return {
        nextState: FlowStates.ADMIN_PROFILE_EDIT,
        response: InteractiveMenus.adminProfileEdit
      };
    }

    // Doctor profile edit - matches the doctor branch in handleViewProfile,
    // so reaching "Edit Profile" via the shared PROFILE_VIEW menu edits the
    // right (doctor) record instead of the patient-oriented form.
    if (effectiveRole === 'doctor') {
      return this.handleEditDoctorProfile(phoneNumber);
    }

    return {
      nextState: FlowStates.PROFILE_EDIT,
      response: InteractiveMenus.profileEdit
    };
  }

  handleAdminProfileEditInput(phoneNumber, message, session) {
    if (message.trim().toLowerCase() === 'menu') {
      return {
        nextState: FlowStates.PROFILE_VIEW,
        response: InteractiveMenus.profileMenu
      };
    }

    const updates = {};

    const lines = message.split('\n');
    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();
      const upperKey = key.trim().toUpperCase();
      if (upperKey === 'NAME') updates.name = value;
    }

    if (Object.keys(updates).length === 0) {
      return {
        nextState: FlowStates.ADMIN_PROFILE_EDIT,
        response: `No valid fields found. Use format: NAME:<your name>\n\n0. Menu`
      };
    }

    // Env-seeded admins (SUPER_ADMIN_CHAT_IDS/PHONES, ADMIN_PHONES) have no
    // adminRegistry record until now - updateAdmin() only mutates an
    // existing record and silently no-ops otherwise, which would leave
    // isAdminProfileComplete() permanently false and lock them out of every
    // admin function forever (this was the actual bug: the bootstrap admin
    // could never complete their own profile). Create the record here if
    // it doesn't exist yet, instead of just updating.
    let admin = this.adminRegistry?.getAdmin(phoneNumber);
    if (!admin) {
      const role = this.isSuperAdminPhone(phoneNumber) ? 'super_admin' : 'admin';
      admin = this.adminRegistry?.addAdmin(phoneNumber, phoneNumber, phoneNumber, role, updates.name);
    } else {
      this.adminRegistry?.updateAdmin(phoneNumber, updates);
      admin = this.adminRegistry?.getAdmin(phoneNumber);
    }

    return {
      nextState: FlowStates.PROFILE_VIEW,
      response: `✅ Admin profile updated!\n\n${InteractiveMenus.adminProfileView(admin || {})}`
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
    const isAdmin = this.adminRegistry?.isAdmin(phoneNumber) || this.adminRegistry?.isAdmin(String(phoneNumber)) ||
      process.env.ADMIN_PHONES?.split(',')?.includes(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_CHAT_IDS?.split(',')?.includes(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_PHONES?.split(',')?.includes(String(phoneNumber));
    if (!isAdmin) {
      return { nextState: FlowStates.WELCOME, response: `❌ Admin access required.\n\n${InteractiveMenus.roleSelect}` };
    }
    const adminProfileComplete = this.adminRegistry?.isAdminProfileComplete(phoneNumber);
    
    // Block all admin actions except profile editing and switch role when profile incomplete
    if (!adminProfileComplete && !['5', '0'].includes(selection)) {
      return {
        nextState: FlowStates.ADMIN_MENU,
        response: `⚠️ *Profile Required*\n\nComplete your admin profile first via option 5 (Profile & Roles).\n\n${InteractiveMenus.adminMenuIncomplete}`
      };
    }
    
    const flowMap = {
      '1': () => this.getPendingRequests(phoneNumber),
      '2': () => this.getActiveConsultations(phoneNumber),
      '3': () => ({ nextState: FlowStates.ADMIN_ROLE_APPROVALS, response: InteractiveMenus.adminRoleApprovals }),
      '4': () => ({ nextState: FlowStates.ADMIN_DOCTOR_MANAGEMENT, response: InteractiveMenus.adminDoctorManagement }),
      '5': () => ({ nextState: FlowStates.PROFILE_VIEW, response: InteractiveMenus.profileMenu }),
      '6': () => this.handleViewAllPatients(phoneNumber),
      '7': () => ({ nextState: FlowStates.ADMIN_VERIFY_PAYMENT_INPUT, response: InteractiveMenus.adminVerifyPaymentInput }),
      '8': () => ({ nextState: FlowStates.ADMIN_VERIFY_DISCOUNT_INPUT, response: InteractiveMenus.adminVerifyDiscountInput }),
      '9': () => ({ nextState: FlowStates.ADMIN_MESSAGE_PATIENT_INPUT, response: InteractiveMenus.adminMessagePatientInput }),
      '10': () => ({ nextState: FlowStates.ADMIN_CLOSE_CONSULTATION, response: InteractiveMenus.closeConsultationPrompt }),
      '11': () => this.isSuperAdminPhone(phoneNumber) ? ({ nextState: FlowStates.ADMIN_ADD_ADMIN_INPUT, response: `🔐 *Add Admin*\n\nEnter phone number for new admin:\n\n0. Back` }) : null,
      '12': () => this.isSuperAdminPhone(phoneNumber) ? ({ nextState: FlowStates.ADMIN_REMOVE_ADMIN_INPUT, response: `🗑️ *Remove Admin*\n\nEnter admin phone to remove:\n\n0. Back` }) : null,
      '0': () => {
        const { getAvailableRoles } = require('../models/persona');
        return { nextState: FlowStates.PERSONA_SELECT, response: InteractiveMenus.personaSelect('admin', getAvailableRoles(phoneNumber)) };
      }
    };


    const handler = flowMap[selection];
    if (handler) {
      const result = handler();
      if (result) return result;
      return { nextState: FlowStates.ADMIN_MENU, response: '❌ Only Super Admin can add/remove admins.\n\n' + InteractiveMenus.adminMenu };
    }
    return { nextState: FlowStates.ADMIN_MENU, response: InteractiveMenus.adminMenu };
  }

  handleAdminDoctorManagementSelection(selection, phoneNumber, session) {
    const isAdmin = this.adminRegistry?.isAdmin(phoneNumber) || this.adminRegistry?.isAdmin(String(phoneNumber)) ||
      process.env.ADMIN_PHONES?.split(',')?.includes(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_CHAT_IDS?.split(',')?.includes(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_PHONES?.split(',')?.includes(String(phoneNumber));
    if (!isAdmin) {
      return { nextState: FlowStates.WELCOME, response: `❌ Admin access required.\n\n${InteractiveMenus.roleSelect}` };
    }
    const adminProfileComplete = this.adminRegistry?.isAdminProfileComplete(phoneNumber);
    
    // Block all doctor management actions when profile incomplete
    if (!adminProfileComplete) {
      return {
        nextState: FlowStates.ADMIN_DOCTOR_MANAGEMENT,
        response: `⚠️ *Profile Required*\n\nComplete your admin profile first (option 5 from main admin menu).\n\n${InteractiveMenus.adminDoctorManagement}`
      };
    }
    
    const flowMap = {
      '1': () => this.listDoctors(phoneNumber),
      '2': () => this.listPendingDoctors(phoneNumber),
      '3': () => ({ nextState: FlowStates.ADMIN_ASSIGN_DOCTOR_INPUT, response: InteractiveMenus.adminAssignDoctorInput }),
      '4': () => ({ nextState: FlowStates.ADMIN_REASSIGN_DOCTOR_INPUT, response: InteractiveMenus.adminReassignDoctorInput }),
      '5': () => ({ nextState: FlowStates.ADMIN_REMOVE_DOCTOR_INPUT, response: InteractiveMenus.adminRemoveDoctorInput }),
      '6': () => ({ nextState: FlowStates.ADMIN_REJECT_DOCTOR_INPUT, response: InteractiveMenus.adminRejectDoctorInput }),
      '7': () => ({ nextState: FlowStates.ADMIN_MESSAGE_DOCTOR_INPUT, response: InteractiveMenus.adminMessageDoctorInput }),
      '8': () => ({ nextState: FlowStates.ADMIN_REGISTER_DOCTOR_INPUT, response: InteractiveMenus.adminRegisterDoctorInput }),
      '9': () => ({ nextState: FlowStates.ADMIN_INVITE_DOCTOR_INPUT, response: InteractiveMenus.adminInviteDoctorInput }),
      '0': () => ({ nextState: FlowStates.ADMIN_MENU, response: InteractiveMenus.adminMenu })
    };
    const handler = flowMap[selection];
    if (handler) return handler();
    return { nextState: FlowStates.ADMIN_DOCTOR_MANAGEMENT, response: InteractiveMenus.adminDoctorManagement };
  }

listDoctors(phoneNumber) {
    const isAdmin = this.adminRegistry?.isAdmin(phoneNumber) || this.adminRegistry?.isAdmin(String(phoneNumber)) ||
      process.env.ADMIN_PHONES?.split(',')?.includes(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_CHAT_IDS?.split(',')?.includes(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_PHONES?.split(',')?.includes(String(phoneNumber));
    if (!isAdmin) {
      return { nextState: FlowStates.ADMIN_DOCTOR_MANAGEMENT, response: `❌ Admin access required.\n\n${InteractiveMenus.adminDoctorManagement}` };
    }
    const doctors = this.doctorRouter?.persistence?.getDoctors() || [];
    let text = '👨⚕️ *All Doctors*\n\n';
    if (doctors.length === 0) {
      text += '_No doctors registered_\n';
    } else {
      doctors.forEach(d => {
        text += `• ${d.id}: ${d.name} (${d.specialty}) - ${d.cancerTypes?.join(', ') || 'any'}\n`;
      });
    }
    return {
      nextState: FlowStates.ADMIN_DOCTOR_MANAGEMENT,
      response: text + '\n' + InteractiveMenus.adminDoctorManagement
    };
  }

  listPendingDoctors(phoneNumber) {
    const isAdmin = this.adminRegistry?.isAdmin(phoneNumber) || this.adminRegistry?.isAdmin(String(phoneNumber)) ||
      process.env.ADMIN_PHONES?.split(',')?.includes(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_CHAT_IDS?.split(',')?.includes(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_PHONES?.split(',')?.includes(String(phoneNumber));
    if (!isAdmin) {
      return { nextState: FlowStates.ADMIN_DOCTOR_MANAGEMENT, response: `❌ Admin access required.\n\n${InteractiveMenus.adminDoctorManagement}` };
    }
    const pending = this.doctorRouter?.persistence?.getPendingDoctors() || [];
    let text = '👨⚕️ *Pending Doctor Requests*\n\n';
    if (pending.length === 0) {
      text += '_No pending doctor requests_';
    } else {
      pending.forEach(d => {
        text += `• ${d.id}: ${d.name} (${d.specialty})\n`;
      });
    }
    return {
      nextState: FlowStates.ADMIN_DOCTOR_MANAGEMENT,
      response: text + '\n' + InteractiveMenus.adminDoctorManagement
    };
  }

  handleAdminAssignDoctorInput(message, phoneNumber, session) {
    const isAdmin = this.adminRegistry?.isAdmin(phoneNumber) || this.adminRegistry?.isAdmin(String(phoneNumber)) ||
      process.env.ADMIN_PHONES?.split(',')?.includes(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_CHAT_IDS?.split(',')?.includes(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_PHONES?.split(',')?.includes(String(phoneNumber));
    if (!isAdmin) {
      return {
        nextState: FlowStates.ADMIN_DOCTOR_MANAGEMENT,
        response: `❌ Admin access required.\n\n${InteractiveMenus.adminDoctorManagement}`
      };
    }
    if (!this.adminRegistry?.isAdminProfileComplete(phoneNumber)) {
      return {
        nextState: FlowStates.ADMIN_ASSIGN_DOCTOR_INPUT,
        response: `⚠️ *Profile Incomplete*\n\nComplete your admin profile (name required) before assigning doctors.\n\n0. Back to Menu`
      };
    }
    const trimmed = message.trim();
    if (trimmed === '0') {
      return { nextState: FlowStates.ADMIN_DOCTOR_MANAGEMENT, response: InteractiveMenus.adminDoctorManagement };
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) {
      return { nextState: FlowStates.ADMIN_ASSIGN_DOCTOR_INPUT, response: `❌ Invalid format. Use: CONSULTATION_ID DOCTOR_ID\n\n0. Back` };
    }
    const [consultationId, doctorId] = parts;
    const consultation = this.consultationManager.getConsultationById(consultationId);
    if (!consultation) {
      return { nextState: FlowStates.ADMIN_ASSIGN_DOCTOR_INPUT, response: `❌ Consultation ${consultationId} not found\n\n0. Back` };
    }
    const doctor = this.doctorRouter?.persistence?.getDoctorById(doctorId);
    if (!doctor) {
      return { nextState: FlowStates.ADMIN_ASSIGN_DOCTOR_INPUT, response: `❌ Doctor ${doctorId} not found\n\n0. Back` };
    }
    this.consultationManager.assignDoctor(consultationId, doctorId, String(phoneNumber));
    return {
      nextState: FlowStates.ADMIN_DOCTOR_MANAGEMENT,
      response: `✅ Assigned ${doctor.name} to ${consultationId}\n\n${InteractiveMenus.adminDoctorManagement}`,
      data: { consultationId, doctorId, patientPhone: consultation.patientPhone }
    };
  }

  handleAdminRemoveDoctorInput(message, phoneNumber, session) {
    const isSuperAdmin = this.adminRegistry?.isSuperAdmin(phoneNumber) || this.adminRegistry?.isSuperAdmin(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_CHAT_IDS?.split(',')?.includes(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_PHONES?.split(',')?.includes(String(phoneNumber));
    if (!isSuperAdmin) {
      return {
        nextState: FlowStates.ADMIN_DOCTOR_MANAGEMENT,
        response: `❌ Only Super Admin can remove doctors.\n\n${InteractiveMenus.adminDoctorManagement}`
      };
    }
    if (!this.adminRegistry?.isAdminProfileComplete(phoneNumber)) {
      return {
        nextState: FlowStates.ADMIN_REMOVE_DOCTOR_INPUT,
        response: `⚠️ *Profile Incomplete*\n\nComplete your admin profile (name required) before removing doctors.\n\n0. Back to Menu`
      };
    }
    const trimmed = message.trim();
    if (trimmed === '0') {
      return { nextState: FlowStates.ADMIN_DOCTOR_MANAGEMENT, response: InteractiveMenus.adminDoctorManagement };
    }
    const doctor = this.doctorRouter?.persistence?.getDoctorById(trimmed);
    if (!doctor) {
      return { nextState: FlowStates.ADMIN_REMOVE_DOCTOR_INPUT, response: `❌ Doctor ${trimmed} not found\n\n0. Back` };
    }
    const activeConsultations = Array.from(this.consultationManager.consultations?.values() || [])
      .filter(c => c.doctorId === trimmed && c.status === 'active');
    if (activeConsultations.length > 0) {
      return {
        nextState: FlowStates.ADMIN_REMOVE_DOCTOR_INPUT,
        response: `❌ Cannot remove doctor with ${activeConsultations.length} active consultation(s). Reassign first.\n\n0. Back`
      };
    }
    const removed = this.doctorRouter?.persistence?.removeDoctor(trimmed);
    if (removed) {
      return {
        nextState: FlowStates.ADMIN_DOCTOR_MANAGEMENT,
        response: `✅ Doctor ${trimmed} removed\n\n${InteractiveMenus.adminDoctorManagement}`
      };
    }
    return { nextState: FlowStates.ADMIN_MENU, response: InteractiveMenus.adminMenu };
  }

  handleAdminMessageDoctorInput(message, phoneNumber, session) {
    const trimmed = message.trim();
    if (trimmed === '0') {
      return { nextState: FlowStates.ADMIN_DOCTOR_MANAGEMENT, response: InteractiveMenus.adminDoctorManagement };
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) {
      return { nextState: FlowStates.ADMIN_MESSAGE_DOCTOR_INPUT, response: `❌ Invalid format. Use: DOCTOR_ID MESSAGE\n\n0. Back` };
    }
    const [doctorId, ...msgParts] = parts;
    const doctor = this.doctorRouter?.persistence?.getDoctorById(doctorId);
    if (!doctor) {
      return { nextState: FlowStates.ADMIN_MESSAGE_DOCTOR_INPUT, response: `❌ Doctor ${doctorId} not found\n\n0. Back` };
    }
    return {
      nextState: FlowStates.ADMIN_DOCTOR_MANAGEMENT,
      response: `📩 *Message Doctor*\n\nTo send message to ${doctor.name}, use: MSG_DOCTOR ${doctorId} your message\n\n0. Back to Menu`,
      data: { doctorId, msg: msgParts.join(' ') }
    };
  }

  handleAdminRejectDoctorInput(message, phoneNumber, session) {
    const isSuperAdmin = this.adminRegistry?.isSuperAdmin(phoneNumber) || this.adminRegistry?.isSuperAdmin(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_CHAT_IDS?.split(',')?.includes(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_PHONES?.split(',')?.includes(String(phoneNumber));
    if (!isSuperAdmin) {
      return {
        nextState: FlowStates.ADMIN_DOCTOR_MANAGEMENT,
        response: `❌ Only Super Admin can reject doctor requests.\n\n${InteractiveMenus.adminDoctorManagement}`
      };
    }
    if (!this.adminRegistry?.isAdminProfileComplete(phoneNumber)) {
      return {
        nextState: FlowStates.ADMIN_REJECT_DOCTOR_INPUT,
        response: `⚠️ *Profile Incomplete*\n\nComplete your admin profile (name required) before rejecting doctors.\n\n0. Back to Menu`
      };
    }
    const trimmed = message.trim();
    if (trimmed === '0') {
      return { nextState: FlowStates.ADMIN_DOCTOR_MANAGEMENT, response: InteractiveMenus.adminDoctorManagement };
    }
    const doctor = this.doctorRouter?.persistence?.getPendingDoctors().find(d => d.id === trimmed);
    if (!doctor) {
      return { nextState: FlowStates.ADMIN_REJECT_DOCTOR_INPUT, response: `❌ Doctor request ${trimmed} not found\n\n0. Back` };
    }
    const rejected = this.doctorRouter?.persistence?.rejectDoctor(trimmed);
    if (rejected) {
      return {
        nextState: FlowStates.ADMIN_DOCTOR_MANAGEMENT,
        response: `✅ Doctor request ${trimmed} rejected\n\n${InteractiveMenus.adminDoctorManagement}`
      };
    }
    return { nextState: FlowStates.ADMIN_MENU, response: InteractiveMenus.adminMenu };
  }

  handleAdminReassignDoctorInput(message, phoneNumber, session) {
    const isSuperAdmin = this.adminRegistry?.isSuperAdmin(phoneNumber) || this.adminRegistry?.isSuperAdmin(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_CHAT_IDS?.split(',')?.includes(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_PHONES?.split(',')?.includes(String(phoneNumber));
    if (!isSuperAdmin) {
      return {
        nextState: FlowStates.ADMIN_DOCTOR_MANAGEMENT,
        response: `❌ Only Super Admin can reassign doctors.\n\n${InteractiveMenus.adminDoctorManagement}`
      };
    }
    if (!this.adminRegistry?.isAdminProfileComplete(phoneNumber)) {
      return {
        nextState: FlowStates.ADMIN_REASSIGN_DOCTOR_INPUT,
        response: `⚠️ *Profile Incomplete*\n\nComplete your admin profile (name required) before reassigning doctors.\n\n0. Back to Menu`
      };
    }
    const trimmed = message.trim();
    if (trimmed === '0') {
      return { nextState: FlowStates.ADMIN_DOCTOR_MANAGEMENT, response: InteractiveMenus.adminDoctorManagement };
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) {
      return { nextState: FlowStates.ADMIN_REASSIGN_DOCTOR_INPUT, response: `❌ Format: CONSULTATION_ID NEW_DOCTOR_ID\n\n0. Back` };
    }
    const [consultationId, newDoctorId] = parts;
    const consultation = this.consultationManager.getConsultationById(consultationId);
    if (!consultation) {
      return { nextState: FlowStates.ADMIN_REASSIGN_DOCTOR_INPUT, response: `❌ Consultation ${consultationId} not found\n\n0. Back` };
    }
    const newDoctor = this.doctorRouter?.persistence?.getDoctorById(newDoctorId);
    if (!newDoctor) {
      return { nextState: FlowStates.ADMIN_REASSIGN_DOCTOR_INPUT, response: `❌ Doctor ${newDoctorId} not found\n\n0. Back` };
    }
    this.consultationManager.reassignDoctor(consultationId, newDoctorId);
    return {
      nextState: FlowStates.ADMIN_DOCTOR_MANAGEMENT,
      response: `✅ Reassigned ${consultationId} from ${consultation.doctorId} to ${newDoctor.name}\n\n${InteractiveMenus.adminDoctorManagement}`,
      data: { consultationId, oldDoctorId: consultation.doctorId, newDoctorId, patientPhone: consultation.patientPhone }
    };
  }

  handleAdminVerifyDiscountInput(message, phoneNumber, session) {
    const isAdmin = this.adminRegistry?.isAdmin(phoneNumber) || this.adminRegistry?.isAdmin(String(phoneNumber)) ||
      process.env.ADMIN_PHONES?.split(',')?.includes(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_CHAT_IDS?.split(',')?.includes(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_PHONES?.split(',')?.includes(String(phoneNumber));
    if (!isAdmin) {
      return {
        nextState: FlowStates.ADMIN_MENU,
        response: `❌ Admin access required.\n\n${InteractiveMenus.adminMenu}`
      };
    }
    if (!this.adminRegistry?.isAdminProfileComplete(phoneNumber)) {
      return {
        nextState: FlowStates.ADMIN_VERIFY_DISCOUNT_INPUT,
        response: `⚠️ *Profile Incomplete*\n\nComplete your admin profile (name required) before processing payments.\n\n0. Back to Menu`
      };
    }
    const trimmed = message.trim();
    if (trimmed === '0') {
      return { nextState: FlowStates.ADMIN_MENU, response: InteractiveMenus.adminMenu };
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) {
      return { nextState: FlowStates.ADMIN_VERIFY_DISCOUNT_INPUT, response: `❌ Format: PHONE approved/rejected [reason]\n\n0. Back` };
    }
    const [patientPhone, rawStatus, ...reasonParts] = parts;
    const status = rawStatus.toLowerCase();
    const reason = reasonParts.join(' ') || '';
    if (!['approved', 'rejected'].includes(status)) {
      return { nextState: FlowStates.ADMIN_VERIFY_DISCOUNT_INPUT, response: `❌ Status must be 'approved' or 'rejected'.\n\nFormat: PHONE approved/rejected [reason]\n\n0. Back` };
    }
    const patientSession = this.consultationManager.getSession(patientPhone);
    if (!patientSession?.patientProfile) {
      return { nextState: FlowStates.ADMIN_VERIFY_DISCOUNT_INPUT, response: `❌ Patient ${patientPhone} not found\n\n0. Back` };
    }
    patientSession.patientProfile.discountVerificationStatus = status;
    patientSession.patientProfile.discountRejectionReason = reason;
    this.consultationManager.updateSession(patientPhone, { patientProfile: patientSession.patientProfile });
    return {
      nextState: FlowStates.ADMIN_MENU,
      response: `✅ Discount ${status} for patient ${patientPhone}${reason ? `: ${reason}` : ''}\n\n${InteractiveMenus.adminMenu}`
    };
  }

  handleAdminVerifyPaymentInput(message, phoneNumber, session) {
    const isAdmin = this.adminRegistry?.isAdmin(phoneNumber) || this.adminRegistry?.isAdmin(String(phoneNumber)) ||
      process.env.ADMIN_PHONES?.split(',')?.includes(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_CHAT_IDS?.split(',')?.includes(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_PHONES?.split(',')?.includes(String(phoneNumber));
    if (!isAdmin) {
      return {
        nextState: FlowStates.ADMIN_MENU,
        response: `❌ Admin access required.\n\n${InteractiveMenus.adminMenu}`
      };
    }
    if (!this.adminRegistry?.isAdminProfileComplete(phoneNumber)) {
      return {
        nextState: FlowStates.ADMIN_VERIFY_PAYMENT_INPUT,
        response: `⚠️ *Profile Incomplete*\n\nComplete your admin profile (name required) before processing payments.\n\n0. Back to Menu`
      };
    }
    const trimmed = message.trim();
    if (trimmed === '0') {
      return { nextState: FlowStates.ADMIN_MENU, response: InteractiveMenus.adminMenu };
    }
    // Synchronous manual verification (not the async gateway-status check) -
    // parseMenuSelection/createFlowHandler are called synchronously by
    // telegramBot.js, so an async handler here would return an
    // unresolved Promise instead of {nextState, response}.
    const verified = this.paymentService?.verifyPaymentManual(trimmed);
    return {
      nextState: FlowStates.ADMIN_MENU,
      response: verified
        ? `✅ Payment verified: ${trimmed}\n\n${InteractiveMenus.adminMenu}`
        : `❌ Payment not found or invalid: ${trimmed}\n\n${InteractiveMenus.adminMenu}`
    };
  }

  handleAdminMessagePatientInput(message, phoneNumber, session) {
    const isAdmin = this.adminRegistry?.isAdmin(phoneNumber) || this.adminRegistry?.isAdmin(String(phoneNumber)) ||
      process.env.ADMIN_PHONES?.split(',')?.includes(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_CHAT_IDS?.split(',')?.includes(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_PHONES?.split(',')?.includes(String(phoneNumber));
    if (!isAdmin) {
      return {
        nextState: FlowStates.ADMIN_MENU,
        response: `❌ Admin access required.\n\n${InteractiveMenus.adminMenu}`
      };
    }
    if (!this.adminRegistry?.isAdminProfileComplete(phoneNumber)) {
      return {
        nextState: FlowStates.ADMIN_MESSAGE_PATIENT_INPUT,
        response: `⚠️ *Profile Incomplete*\n\nComplete your admin profile (name required) before messaging patients.\n\n0. Back to Menu`
      };
    }
    const trimmed = message.trim();
    if (trimmed === '0') {
      return { nextState: FlowStates.ADMIN_MENU, response: InteractiveMenus.adminMenu };
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) {
      return { nextState: FlowStates.ADMIN_MESSAGE_PATIENT_INPUT, response: `❌ Format: PHONE MESSAGE\n\n0. Back` };
    }
    const [patientPhone, ...msgParts] = parts;
    const msgText = msgParts.join(' ');
    return {
      nextState: FlowStates.ADMIN_MENU,
      response: `📩 To message patient ${patientPhone}, use: MSG_PATIENT ${patientPhone} ${msgText}\n\n0. Back to Menu`
    };
  }

  handleAdminRoleApprovalsSelection(selection, phoneNumber, session) {
    const flowMap = {
      '1': () => this.getDoctorApplications(phoneNumber),
      '2': () => ({ nextState: FlowStates.ADMIN_APPROVE_DOCTOR_INPUT, response: InteractiveMenus.adminApproveDoctorInput }),
      '3': () => ({ nextState: FlowStates.ADMIN_APPROVE_CAREGIVER_INPUT, response: InteractiveMenus.adminApproveCaregiverInput }),
      '4': () => ({ nextState: FlowStates.ADMIN_APPROVE_SUPPORT_INPUT, response: InteractiveMenus.adminApproveSupportInput }),
      '0': () => ({ nextState: FlowStates.ADMIN_MENU, response: InteractiveMenus.adminMenu })
    };
    const handler = flowMap[selection];
    if (handler) return handler();
    return { nextState: FlowStates.ADMIN_ROLE_APPROVALS, response: InteractiveMenus.adminRoleApprovals };
  }

  getDoctorApplications(phoneNumber) {
    // Only super_admin can actually approve doctor/caregiver/support role
    // requests (see the isSuperAdmin checks in the approve handlers below),
    // so a regular admin has no need-to-know for applicants' contact IDs.
    if (!this.isSuperAdminPhone(phoneNumber)) {
      return {
        nextState: FlowStates.ADMIN_ROLE_APPROVALS,
        response: `❌ Only Super Admin can view/approve role applications.\n\n${InteractiveMenus.adminRoleApprovals}`
      };
    }
    const requests = this.userRegistry.getPendingRequests() || [];
    let text = '📋 *Role Applications*\n\n';
    if (requests.length === 0) {
      text += '_No pending role applications_\n';
    } else {
      requests.forEach(r => {
        text += `• ${r.chatId}: ${r.appliedRoles?.join(', ') || 'unknown'}\n`;
      });
    }
    return {
      nextState: FlowStates.ADMIN_ROLE_APPROVALS,
      response: text + '\n' + InteractiveMenus.adminRoleApprovals
    };
  }

  handleAdminApproveDoctorInput(message, phoneNumber, session) {
    const isSuperAdmin = this.adminRegistry?.isSuperAdmin(phoneNumber) || this.adminRegistry?.isSuperAdmin(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_CHAT_IDS?.split(',')?.includes(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_PHONES?.split(',')?.includes(String(phoneNumber));
    if (!isSuperAdmin) {
      return {
        nextState: FlowStates.ADMIN_ROLE_APPROVALS,
        response: `❌ Only Super Admin can approve doctors.\n\n${InteractiveMenus.adminRoleApprovals}`
      };
    }
    if (!this.adminRegistry?.isAdminProfileComplete(phoneNumber)) {
      return {
        nextState: FlowStates.ADMIN_APPROVE_DOCTOR_INPUT,
        response: `⚠️ *Profile Incomplete*\n\nComplete your admin profile (name & phone required) before approving roles.\n\n0. Back to Menu`
      };
    }
    const trimmed = message.trim();
    if (trimmed === '0') {
      return { nextState: FlowStates.ADMIN_ROLE_APPROVALS, response: InteractiveMenus.adminRoleApprovals };
    }
    const user = this.userRegistry.getUser(trimmed) || this.userRegistry.getUserByPhone(trimmed);
    if (!user) {
      return { nextState: FlowStates.ADMIN_APPROVE_DOCTOR_INPUT, response: `❌ No user found for ${trimmed}\n\n0. Back` };
    }
    if (this.userRegistry.approveRole(user.chatId, 'doctor', phoneNumber)) {
      const doctor = {
        id: `doc_${Date.now()}`,
        telegramId: user.chatId,
        name: user.name || 'Doctor',
        specialty: 'general',
        cancerTypes: ['general', 'lung', 'breast'],
        consultationFee: 1500
      };
      this.doctorRouter?.persistence?.addDoctor(doctor);
      return {
        nextState: FlowStates.ADMIN_ROLE_APPROVALS,
        response: `✅ Doctor approved for ${trimmed}\n\n${InteractiveMenus.adminRoleApprovals}`
      };
    }
    return { nextState: FlowStates.ADMIN_MENU, response: InteractiveMenus.adminMenu };
  }

  handleAdminApproveCaregiverInput(message, phoneNumber, session) {
    const isSuperAdmin = this.adminRegistry?.isSuperAdmin(phoneNumber) || this.adminRegistry?.isSuperAdmin(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_CHAT_IDS?.split(',')?.includes(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_PHONES?.split(',')?.includes(String(phoneNumber));
    if (!isSuperAdmin) {
      return {
        nextState: FlowStates.ADMIN_ROLE_APPROVALS,
        response: `❌ Only Super Admin can approve caregivers.\n\n${InteractiveMenus.adminRoleApprovals}`
      };
    }
    if (!this.adminRegistry?.isAdminProfileComplete(phoneNumber)) {
      return {
        nextState: FlowStates.ADMIN_APPROVE_CAREGIVER_INPUT,
        response: `⚠️ *Profile Incomplete*\n\nComplete your admin profile (name & phone required) before approving roles.\n\n0. Back to Menu`
      };
    }
    const trimmed = message.trim();
    if (trimmed === '0') {
      return { nextState: FlowStates.ADMIN_ROLE_APPROVALS, response: InteractiveMenus.adminRoleApprovals };
    }
    const user = this.userRegistry.getUser(trimmed) || this.userRegistry.getUserByPhone(trimmed);
    if (!user) {
      return { nextState: FlowStates.ADMIN_APPROVE_CAREGIVER_INPUT, response: `❌ No user found for ${trimmed}\n\n0. Back` };
    }
    if (this.userRegistry.approveRole(user.chatId, 'caregiver', phoneNumber)) {
      return {
        nextState: FlowStates.ADMIN_ROLE_APPROVALS,
        response: `✅ Caregiver approved for ${trimmed}\n\n${InteractiveMenus.adminRoleApprovals}`
      };
    }
    return { nextState: FlowStates.ADMIN_MENU, response: InteractiveMenus.adminMenu };
  }

  handleAdminApproveSupportInput(message, phoneNumber, session) {
    const isSuperAdmin = this.adminRegistry?.isSuperAdmin(phoneNumber) || this.adminRegistry?.isSuperAdmin(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_CHAT_IDS?.split(',')?.includes(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_PHONES?.split(',')?.includes(String(phoneNumber));
    if (!isSuperAdmin) {
      return {
        nextState: FlowStates.ADMIN_ROLE_APPROVALS,
        response: `❌ Only Super Admin can approve support.\n\n${InteractiveMenus.adminRoleApprovals}`
      };
    }
    if (!this.adminRegistry?.isAdminProfileComplete(phoneNumber)) {
      return {
        nextState: FlowStates.ADMIN_APPROVE_SUPPORT_INPUT,
        response: `⚠️ *Profile Incomplete*\n\nComplete your admin profile (name & phone required) before approving roles.\n\n0. Back to Menu`
      };
    }
    const trimmed = message.trim();
    if (trimmed === '0') {
      return { nextState: FlowStates.ADMIN_ROLE_APPROVALS, response: InteractiveMenus.adminRoleApprovals };
    }
    const user = this.userRegistry.getUser(trimmed) || this.userRegistry.getUserByPhone(trimmed);
    if (!user) {
      return { nextState: FlowStates.ADMIN_APPROVE_SUPPORT_INPUT, response: `❌ No user found for ${trimmed}\n\n0. Back` };
    }
    if (this.userRegistry.approveRole(user.chatId, 'support', phoneNumber)) {
      return {
        nextState: FlowStates.ADMIN_ROLE_APPROVALS,
        response: `✅ Support approved for ${trimmed}\n\n${InteractiveMenus.adminRoleApprovals}`
      };
    }
    return { nextState: FlowStates.ADMIN_MENU, response: InteractiveMenus.adminMenu };
  }

  handleAdminRegisterDoctorInput(message, phoneNumber, session) {
    const isAdmin = this.adminRegistry?.isAdmin(phoneNumber) || this.adminRegistry?.isAdmin(String(phoneNumber)) ||
      process.env.ADMIN_PHONES?.split(',')?.includes(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_CHAT_IDS?.split(',')?.includes(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_PHONES?.split(',')?.includes(String(phoneNumber));
    if (!isAdmin) {
      return {
        nextState: FlowStates.ADMIN_DOCTOR_MANAGEMENT,
        response: `❌ Admin access required.\n\n${InteractiveMenus.adminDoctorManagement}`
      };
    }
    if (!this.adminRegistry?.isAdminProfileComplete(phoneNumber)) {
      return {
        nextState: FlowStates.ADMIN_REGISTER_DOCTOR_INPUT,
        response: `⚠️ *Profile Incomplete*\n\nComplete your admin profile (name required) before registering doctors.\n\n0. Back to Menu`
      };
    }
    const trimmed = message.trim();
    if (trimmed === '0') {
      return { nextState: FlowStates.ADMIN_DOCTOR_MANAGEMENT, response: InteractiveMenus.adminDoctorManagement };
    }
    const parts = trimmed.split(',').map(p => p.trim());
    if (parts.length < 3) {
      return { nextState: FlowStates.ADMIN_REGISTER_DOCTOR_INPUT, response: `Invalid format. Use: NAME, SPECIALIZATION, PHONE, CANCERS\n\n0. Back` };
    }
    const [name, specialty, phone, cancersStr] = parts;
    const cancerTypes = cancersStr ? cancersStr.split(',').map(c => c.trim().toLowerCase()).filter(c => c) : [];
    
    // Check if admin is registering themselves
    const { getAvailableRoles } = require('../models/persona');
    const isSelfRegistration = String(phone).replace(/\D/g, '').replace(/^91/, '') === String(phoneNumber).replace(/\D/g, '').replace(/^91/, '');
    
    const doctor = this.doctorRouter?.persistence?.addDoctor({
      id: `doc_${Date.now()}`,
      name,
      phoneNumber: phone,
      specialty,
      cancerTypes,
      consultationFee: 1500,
      approvedBy: String(phoneNumber),
      ...(isSelfRegistration && { telegramId: String(phoneNumber) })
    });
    
    if (doctor) {
      // Create userRegistry entry with doctor role approved so user can switch to Doctor Mode
      // For self-registration, phoneNumber is the chatId; for others, look up by phone
      if (isSelfRegistration) {
        this.userRegistry.createUser(String(phoneNumber), phone);
        this.userRegistry.approveRole(String(phoneNumber), 'doctor', String(phoneNumber));
      } else {
        const existingUser = this.userRegistry.getUserByPhone(phone);
        if (existingUser) {
          this.userRegistry.approveRole(existingUser.chatId, 'doctor', String(phoneNumber));
        } else {
          this.userRegistry.createUser(phone, phone);
          this.userRegistry.approveRole(phone, 'doctor', String(phoneNumber));
        }
      }
      return {
        nextState: FlowStates.ADMIN_DOCTOR_MANAGEMENT,
        response: `✅ Doctor registered: ${doctor.id} (${doctor.name})\nAsk doctor to start bot with /start\n\n${InteractiveMenus.adminDoctorManagement}`
      };
    }
    return { nextState: FlowStates.ADMIN_MENU, response: InteractiveMenus.adminMenu };
  }

handleAdminInviteDoctorInput(message, phoneNumber, session) {
    const isAdmin = this.adminRegistry?.isAdmin(phoneNumber) || this.adminRegistry?.isAdmin(String(phoneNumber)) ||
      process.env.ADMIN_PHONES?.split(',')?.includes(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_CHAT_IDS?.split(',')?.includes(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_PHONES?.split(',')?.includes(String(phoneNumber));
    if (!isAdmin) {
      return {
        nextState: FlowStates.ADMIN_DOCTOR_MANAGEMENT,
        response: `❌ Admin access required.\n\n${InteractiveMenus.adminDoctorManagement}`
      };
    }
    if (!this.adminRegistry?.isAdminProfileComplete(phoneNumber)) {
      return {
        nextState: FlowStates.ADMIN_INVITE_DOCTOR_INPUT,
        response: `⚠️ *Profile Incomplete*\n\nComplete your admin profile (name required) before inviting doctors.\n\n0. Back to Menu`
      };
    }
    const trimmed = message.trim();
    if (trimmed === '0') {
      return { nextState: FlowStates.ADMIN_DOCTOR_MANAGEMENT, response: InteractiveMenus.adminDoctorManagement };
    }
    const parts = trimmed.split(',').map(p => p.trim());
    if (parts.length < 3) {
      return { nextState: FlowStates.ADMIN_INVITE_DOCTOR_INPUT, response: `Invalid format. Use: NAME, SPECIALIZATION, PHONE, CANCERS\n\n0. Back` };
    }
    const [name, specialty, phone, cancersStr] = parts;
    const cancerTypes = cancersStr ? cancersStr.split(',').map(c => c.trim().toLowerCase()).filter(c => c) : [];
    
    const invitation = this.doctorRouter?.persistence?.createDoctorRequest({
      name,
      phoneNumber: phone,
      specialty,
      cancerTypes,
      consultationFee: 1500
    }, String(phoneNumber));
    
    if (invitation) {
      return {
        nextState: FlowStates.ADMIN_DOCTOR_MANAGEMENT,
        response: `✅ Doctor invited: ${invitation.id} (${name})\nInvitation sent.\n\n${InteractiveMenus.adminDoctorManagement}`
      };
    }
    return { nextState: FlowStates.ADMIN_MENU, response: InteractiveMenus.adminMenu };
  }

  // Contact info (patient/doctor phone or chat identifier) must only be
  // visible to super_admin or the specific admin who is actually handling
  // that record (e.g. the admin who assigned a doctor to this
  // consultation) - not to admins in general. This prevents anyone from
  // using the app's own admin tools to collect contact details and reach
  // people outside the platform. Unassigned/pending records have no
  // handling admin yet, so any admin can see them (someone has to be able
  // to triage new requests).
  isSuperAdminPhone(phoneNumber) {
    return !!(this.adminRegistry?.isSuperAdmin(phoneNumber) || this.adminRegistry?.isSuperAdmin(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_CHAT_IDS?.split(',')?.includes(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_PHONES?.split(',')?.includes(String(phoneNumber)));
  }

  canViewConsultationContact(adminPhone, consultation) {
    if (this.isSuperAdminPhone(adminPhone)) return true;
    if (!consultation.doctorId) return true;
    return consultation.adminAssigned === String(adminPhone);
  }

  getPendingRequests(phoneNumber) {
    const isAdmin = this.adminRegistry?.isAdmin(phoneNumber) || this.adminRegistry?.isAdmin(String(phoneNumber)) ||
      process.env.ADMIN_PHONES?.split(',')?.includes(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_CHAT_IDS?.split(',')?.includes(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_PHONES?.split(',')?.includes(String(phoneNumber));
    if (!isAdmin) {
      return { nextState: FlowStates.ADMIN_MENU, response: `❌ Admin access required.\n\n${InteractiveMenus.adminMenu}` };
    }
    const pending = this.consultationManager.getPendingForAdmin();
    let text = `📋 *Pending Consultations*\n\n`;

    if (pending.length === 0) {
      text += `_No pending consultations_\n`;
    } else {
      pending.forEach(c => {
        const contact = this.canViewConsultationContact(phoneNumber, c) ? c.patientPhone : c.id;
        text += `• ${contact} - ${c.cancerType || 'not set'} - ${c.media?.length || 0} docs\n`;
      });
    }

    return {
      nextState: FlowStates.ADMIN_MENU,
      response: text + `\n${InteractiveMenus.adminMenu}`
    };
  }

  getActiveConsultations(phoneNumber) {
    const isAdmin = this.adminRegistry?.isAdmin(phoneNumber) || this.adminRegistry?.isAdmin(String(phoneNumber)) ||
      process.env.ADMIN_PHONES?.split(',')?.includes(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_CHAT_IDS?.split(',')?.includes(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_PHONES?.split(',')?.includes(String(phoneNumber));
    if (!isAdmin) {
      return { nextState: FlowStates.ADMIN_MENU, response: `❌ Admin access required.\n\n${InteractiveMenus.adminMenu}` };
    }
    const active = Array.from(this.consultationManager.consultations.values())
      .filter(c => c.status === 'active');
    let text = `📊 *Active Consultations*\n\n`;

    if (active.length === 0) {
      text += `_No active consultations_\n`;
    } else {
      active.forEach(c => {
        const contact = this.canViewConsultationContact(phoneNumber, c) ? c.patientPhone : '(restricted)';
        text += `• ${c.id}: ${contact} - Dr. ${c.doctorId || 'unassigned'}\n`;
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
    const isAdmin = this.adminRegistry?.isAdmin(phoneNumber) || this.adminRegistry?.isAdmin(String(phoneNumber)) ||
      process.env.ADMIN_PHONES?.split(',')?.includes(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_CHAT_IDS?.split(',')?.includes(String(phoneNumber)) ||
      process.env.SUPER_ADMIN_PHONES?.split(',')?.includes(String(phoneNumber));
    if (!isAdmin) {
      return {
        nextState: FlowStates.ADMIN_MENU,
        response: `❌ Admin access required.\n\n${InteractiveMenus.adminMenu}`
      };
    }
    if (!this.adminRegistry?.isAdminProfileComplete(phoneNumber)) {
      return {
        nextState: FlowStates.ADMIN_CLOSE_CONSULTATION,
        response: `⚠️ *Profile Incomplete*\n\nComplete your admin profile (name required) before closing consultations.\n\n0. Back to Menu`
      };
    }
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

  // Opt-in fee-discount eligibility flow, reached from the Billing menu.
  // Separate from the mandatory profile walkthrough since eligibility
  // sharing is opt-in per the platform terms (non-consent = full fee).
  handleDiscountCategorySelection(selection, phoneNumber, session) {
    const trimmed = String(selection).trim();
    if (trimmed === '0') {
      return { nextState: FlowStates.BILLING, response: InteractiveMenus.billing };
    }
    const categoryMap = {
      '1': 'bpl_ews', '2': 'ayushman_bharat', '3': 'eshram', '4': 'farmer',
      '5': 'defence', '6': 'paramilitary', '7': 'police', '8': 'government_employee',
      '9': 'freedom_fighter_dependent', '10': 'senior_citizen', '11': 'widow_single_woman',
      '12': 'pwd_udid', '13': 'sc_st', '14': 'minority_community', '15': 'rural_tribal',
      '16': 'healthcare_worker', '17': 'teacher_anganwadi', '18': 'journalist', '19': 'none'
    };
    const category = categoryMap[trimmed];
    if (!category) {
      return { nextState: FlowStates.PROFILE_DISCOUNT_CATEGORY, response: `❌ Invalid selection.\n\n${InteractiveMenus.discountCategories}` };
    }

    // Eligibility describes the PATIENT being treated and billed, not
    // whoever is submitting it - a caregiver applying on the patient's
    // behalf must write this to the linked patient's own profile, or the
    // discount would never actually apply to the patient's real bill.
    const targetPhone = (session?.isCaregiver && session?.linkedPatientPhone) ? session.linkedPatientPhone : phoneNumber;
    const targetProfile = this.consultationManager.getSession(targetPhone)?.patientProfile || {};
    targetProfile.discountCategory = category;

    if (category === 'none') {
      targetProfile.discountVerificationStatus = 'not_applied';
      this.consultationManager.updateSession(targetPhone, { patientProfile: targetProfile });
      this.consultationManager.updateSession(phoneNumber, { flowState: FlowStates.BILLING });
      return { nextState: FlowStates.BILLING, response: `✅ Proceeding at full fee.\n\n${InteractiveMenus.billing}` };
    }

    targetProfile.discountVerificationStatus = 'pending';
    this.consultationManager.updateSession(targetPhone, { patientProfile: targetProfile });
    this.consultationManager.updateSession(phoneNumber, { flowState: FlowStates.PROFILE_DISCOUNT_DOCUMENTS });
    return {
      nextState: FlowStates.PROFILE_DISCOUNT_DOCUMENTS,
      response: `📎 Please upload eligibility documents for *${category.replace(/_/g, ' ')}* (ration card, Ayushman card, etc.) as a photo or file. Admin will review and apply the discount at their discretion.\n\n0. Skip`
    };
  }

  handleDiscountDocumentsInput(message, phoneNumber, session) {
    const trimmed = message.trim();
    if (trimmed === '0' || trimmed.toLowerCase() === 'skip') {
      return { nextState: FlowStates.BILLING, response: `ℹ️ You can upload eligibility documents anytime before payment from the Billing menu.\n\n${InteractiveMenus.billing}` };
    }
    return {
      nextState: FlowStates.PROFILE_DISCOUNT_DOCUMENTS,
      response: `📎 Please send your eligibility document as a photo or file, or type 0 to skip.`
    };
  }

  handleDoctorSelection(selection, phoneNumber, session) {
    if (selection === '0') {
      return { nextState: FlowStates.WELCOME, response: InteractiveMenus.main() };
    }

    const effectiveSession = (session?.isCaregiver && session?.linkedPatientPhone)
      ? { ...session, ...this.consultationManager.getSession(session.linkedPatientPhone) }
      : session;

    const doctors = this.doctorRouter?.getAvailableDoctors?.(effectiveSession?.cancerType) || [];
    const doctorIndex = parseInt(selection) - 1;

    if (doctorIndex < 0 || doctorIndex >= doctors.length) {
      return {
        nextState: FlowStates.DOCTOR_SELECT,
        response: `❌ Invalid selection. Please choose a valid doctor:\n\n${InteractiveMenus.doctorSelect(doctors)}`
      };
    }

    const selectedDoctor = doctors[doctorIndex];
    const consultation = this.consultationManager.createConsultation(phoneNumber, selectedDoctor.id, effectiveSession);

    return {
      nextState: FlowStates.CONSULTATION,
      response: `✅ Connected to Dr. ${selectedDoctor.name} (${selectedDoctor.specialty}).\nConsultation fee: ₹${selectedDoctor.fee || 1500}\n\nReply to start consultation.`,
      data: { consultationCreated: true, doctorId: selectedDoctor.id }
    };
  }

  handleConsultationCompleted(selection, phoneNumber) {
    const flowMap = {
      '1': () => ({ nextState: FlowStates.CONSULTATION, response: InteractiveMenus.consultation }),
      '2': () => ({ nextState: FlowStates.PROFILE_VIEW, response: InteractiveMenus.profileMenu }),
      '0': () => ({ nextState: FlowStates.WELCOME, response: InteractiveMenus.main() })
    };

    const handler = flowMap[selection];
    if (handler) {
      return handler();
    }

    return {
      nextState: FlowStates.COMPLETED,
      response: InteractiveMenus.consultationCompleted
    };
  }

  handleViewLinkedPatients(phoneNumber, session) {
    const doctorId = session?.doctorId;
    const consultations = Array.from(this.consultationManager.consultations?.values() || [])
      .filter(c => c.doctorId === doctorId && c.status === 'active');

    const patients = consultations.map(c => {
      const patientSession = this.consultationManager.getSession(c.patientPhone);
      return {
        phoneNumber: c.patientPhone,
        name: patientSession?.patientProfile?.name || 'Unknown',
        cancerType: patientSession?.cancerType || 'unknown'
      };
    });

    return {
      nextState: FlowStates.DOCTOR_MENU,
      response: InteractiveMenus.profileLinkedPatients(patients)
    };
  }


handleDoctorMenuSelection(selection, phoneNumber, session) {
    const flowMap = {
      '1': () => this.handleDoctorStatus(phoneNumber, session),
      '2': () => this.handleViewLinkedPatients(phoneNumber, session),
      '3': () => this.handleEditDoctorProfile(phoneNumber),
      '4': () => ({ nextState: FlowStates.DOCTOR_MSG_ADMIN_INPUT, response: `📩 *Message Admin*\n\nSend your message to admin:\n\n0. Back` }),
      '0': () => {
        const { getAvailableRoles } = require('../models/persona');
        return { nextState: FlowStates.PERSONA_SELECT, response: InteractiveMenus.personaSelect('doctor', getAvailableRoles(phoneNumber)) };
      }
    };

    const handler = flowMap[selection];
    if (handler) {
      return handler();
    }

    const activeConsultation = Array.from(this.consultationManager.consultations.values())
      .find(c => c.doctorId === session?.doctorId && c.status === 'active');
    const consultationInfo = activeConsultation ? `\nActive: ${activeConsultation.id}` : '';
    return {
      nextState: FlowStates.DOCTOR_MENU,
      response: `Invalid option.\n\n${InteractiveMenus.doctorMenu('Doctor', !!activeConsultation)}`
    };
  }

  handleEditDoctorProfile(phoneNumber) {
    const doctor = this.doctorRouter?.persistence?.getDoctors().find(d => d.telegramId === String(phoneNumber));
    if (!doctor) {
      return {
        nextState: FlowStates.DOCTOR_MENU,
        response: `Doctor profile not found. Contact admin to register you.`
      };
    }
    return {
      nextState: FlowStates.DOCTOR_PROFILE_EDIT,
      response: `✏️ *Edit Doctor Profile*\n\nSend your details in this format:\n\`SPECIALTY:<specialty>\nCANCERTYPES:<lung,breast>\nHOSPITAL:<hospital>\nCITY:<city>\nQUALIFICATIONS:<MBBS,MD>\n\nOr reply FIELD:VALUE on separate lines.`
    };
  }

  handleDoctorProfileEditInput(phoneNumber, message, session) {
    if (message.trim().toLowerCase() === 'menu' || message.trim() === '0') {
      const doctor = this.doctorRouter?.persistence?.getDoctors().find(d => d.telegramId === String(phoneNumber));
      return {
        nextState: FlowStates.DOCTOR_MENU,
        response: InteractiveMenus.doctorMenu(doctor?.name || 'Doctor', false)
      };
    }

    const doctor = this.doctorRouter?.persistence?.getDoctors().find(d => d.telegramId === String(phoneNumber));
    const updates = {};

    const lines = message.split('\n');
    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();
      const upperKey = key.trim().toUpperCase();
      if (upperKey === 'SPECIALTY') updates.specialty = value.split(',').map(s => s.trim());
      else if (upperKey === 'CANCERTYPES') updates.cancerTypes = value.split(',').map(c => c.trim().toLowerCase());
      else if (upperKey === 'HOSPITAL') updates.hospital = value;
      else if (upperKey === 'CITY') updates.city = value;
      else if (upperKey === 'QUALIFICATIONS') updates.qualifications = value.split(',').map(q => q.trim());
    }

    if (Object.keys(updates).length === 0) {
      return {
        nextState: FlowStates.DOCTOR_PROFILE_EDIT,
        response: `No valid fields found. Use format: SPECIALTY:<value>\nCANCERTYPES:<value>\nHOSPITAL:<value>\nCITY:<value>\nQUALIFICATIONS:<value>\n\n0. Menu`
      };
    }

    this.doctorRouter?.persistence?.updateDoctor(doctor.id, updates);
    return {
      nextState: FlowStates.DOCTOR_MENU,
      response: `✅ Doctor profile updated!\n\n${InteractiveMenus.doctorMenu(doctor.name, false)}`
    };
  }

  handleDoctorMsgAdminInput(phoneNumber, message, session) {
    const doctor = this.doctorRouter?.persistence?.getDoctors().find(d => d.telegramId === String(phoneNumber));

    if (message.trim().toLowerCase() === 'menu' || message.trim() === '0') {
      return {
        nextState: FlowStates.DOCTOR_MENU,
        response: InteractiveMenus.doctorMenu(doctor?.name || 'Doctor', false)
      };
    }

    // session.doctorId is the doctor assigned to a PATIENT's consultation -
    // meaningless on a doctor's own session. The doctor's own record id
    // (looked up above) is what getAdminForDoctor actually needs; using
    // session?.doctorId here always resolved to undefined, so this always
    // fell through to "No admin associated" regardless of whether one
    // actually approved this doctor.
    const adminPhone = doctor && this.doctorRouter?.persistence?.getAdminForDoctor?.(doctor.id);
    if (adminPhone) {
      const trimmedMessage = message.trim();
      return {
        nextState: FlowStates.DOCTOR_MENU,
        response: `✅ Message sent to admin.\n\n${InteractiveMenus.doctorMenu(doctor?.name || 'Doctor', false)}`,
        // The response above claimed success, but nothing actually sent the
        // message anywhere - conversationFlow.js can't call bot.sendMessage
        // itself, so surface it via data for telegramBot.js to deliver,
        // matching the pattern used for doctor-assign/reassign notifications.
        data: { doctorMsgToAdmin: { adminPhone, doctorName: doctor?.name || 'Doctor', message: trimmedMessage } }
      };
    }
    return {
      nextState: FlowStates.DOCTOR_MENU,
      response: `❌ No admin associated with your registration.\n\n${InteractiveMenus.doctorMenu(doctor?.name || 'Doctor', false)}`
    };
  }

  handleAdminAddAdminInput(message, phoneNumber, session) {
    if (message.trim().toLowerCase() === 'menu' || message.trim() === '0') {
      return { nextState: FlowStates.ADMIN_MENU, response: InteractiveMenus.adminMenu };
    }
    const trimmed = message.trim();
    if (!trimmed.match(/^\d{10}$/)) {
      return { nextState: FlowStates.ADMIN_ADD_ADMIN_INPUT, response: `❌ Invalid phone number.\n\n0. Back to Menu` };
    }
    this.adminRegistry?.addAdmin(trimmed, phoneNumber, null, 'admin');
    return { nextState: FlowStates.ADMIN_MENU, response: `✅ Admin added for ${trimmed}.\n\n${InteractiveMenus.adminMenu}` };
  }

  handleAdminRemoveAdminInput(message, phoneNumber, session) {
    if (message.trim().toLowerCase() === 'menu' || message.trim() === '0') {
      return { nextState: FlowStates.ADMIN_MENU, response: InteractiveMenus.adminMenu };
    }
    const trimmed = message.trim();
    const removed = this.adminRegistry?.removeAdmin(trimmed);
    if (removed) {
      return { nextState: FlowStates.ADMIN_MENU, response: `✅ Admin ${trimmed} removed.\n\n${InteractiveMenus.adminMenu}` };
    }
    return { nextState: FlowStates.ADMIN_REMOVE_ADMIN_INPUT, response: `❌ Admin ${trimmed} not found.\n\n0. Back to Menu` };
  }

  handleDoctorStatus(phoneNumber, session) {
    const doctor = this.doctorRouter?.persistence?.getDoctorByPhone?.(phoneNumber) || 
                   this.doctorRouter?.persistence?.getDoctors?.().find(d => d.telegramId === phoneNumber);
    if (!doctor) return { nextState: FlowStates.DOCTOR_MENU, response: '❌ Doctor profile not found' };
    
    return {
      nextState: FlowStates.DOCTOR_MENU,
      response: `👨⚕️ *Doctor Status*

Name: ${doctor.name}
Specialty: ${doctor.specialty}
Cancer Types: ${doctor.cancerTypes?.join(', ') || 'Any'}
Fee: ₹${doctor.consultationFee || 1500}

0. Back`
    };
  }

  handleViewAllPatients(phoneNumber) {
    // Unlike Pending/Active Consultations (scoped to a specific record an
    // admin is actually processing), this browses every patient's contact
    // info with no task-scoping at all - restricted to super_admin only.
    if (!this.isSuperAdminPhone(phoneNumber)) {
      return {
        nextState: FlowStates.ADMIN_MENU,
        response: `❌ Only Super Admin can browse all patient contact info.\n\nUse Pending Requests or Active Consultations to see patients you're actively handling.\n\n${InteractiveMenus.adminMenu}`
      };
    }
    const patients = [];
    for (const [phone, session] of this.consultationManager.sessions || []) {
      if (session?.patientProfile) {
        patients.push({
          phoneNumber: phone,
          name: session.patientProfile.name,
          cancerType: session.cancerType
        });
      }
    }
    let text = `👥 *All Patients*\n\n`;
    if (patients.length === 0) {
      text += '_No patients registered._\n';
    } else {
      patients.forEach((p, i) => {
        text += `${i + 1}. ${p.name} (${p.phoneNumber}) - ${p.cancerType || 'unknown'}\n`;
      });
      text += '\nEnter phone number to view profile.';
    }
    return {
      nextState: FlowStates.ADMIN_MENU,
      response: text + '\n\n' + InteractiveMenus.adminMenu
    };
  }

  handleViewMyDoctors(phoneNumber, session) {
    const doctors = this.doctorRouter?.getDoctorsByPatient ? this.doctorRouter.getDoctorsByPatient(phoneNumber) : [];
    return {
      nextState: FlowStates.PROFILE_VIEW,
      response: InteractiveMenus.profileMyDoctors(doctors)
    };
  }

  handleProfileConsentsSelection(selection, phoneNumber, session) {
    const profile = session?.patientProfile || {};
    const consents = profile.confirmedConsents || {};
    
    // Map selections to consent types
    const consentMap = {
      '1': 'teleconsultation',
      '2': 'dataSharing',
      '3': 'dpdp',
      'cancel': 'cancel'
    };
    
    const consentType = consentMap[selection] || consentMap[selection.toLowerCase()];
    
    if (consentType === 'cancel') {
      this.consultationManager.resetSession(phoneNumber);
      return {
        nextState: FlowStates.WELCOME,
        response: `❌ You must accept all consents to use this service.\n\nType /start to try again.`
      };
    }
    
    if (consentType) {
      consents[consentType] = true;
      profile.confirmedConsents = consents;
      profile.consentTimestamp = new Date();
      
      // Check if all consents are confirmed
      const allConfirmed = consents.teleconsultation && consents.dataSharing && consents.dpdp;
      
      this.consultationManager.updateSession(phoneNumber, { patientProfile: profile });
      
      if (allConfirmed) {
        return {
          nextState: FlowStates.WELCOME,
          response: `✅ All consents confirmed.\n\n${this.getGreeting(phoneNumber)}`
        };
      }
      
      return {
        nextState: FlowStates.PROFILE_CONSENTS,
        response: InteractiveMenus.consentsMenu
      };
    }
    
    // Invalid selection - show menu again
    return {
      nextState: FlowStates.PROFILE_CONSENTS,
      response: `❌ Invalid selection. Please confirm all consents:\n\n${InteractiveMenus.consentsMenu}`
    };
  }
}

module.exports = { ConversationFlow, FlowStates, InteractiveMenus };