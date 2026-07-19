const { FlowStates } = require('./conversationFlow');

const MAX_FILE_SIZE_MB = 20;

const buildMainMenu = (persona = 'patient', hasOtherRoles = false, profileComplete = true, isAdmin = false, isSuperAdmin = false, pendingCount = 0, activeCount = 0) => {
  const buttons = [];
  
  if (!profileComplete) {
    buttons.push([{ text: '🔴 1️⃣ My Consultations', callback_data: 'consultation' }]);
  } else {
    buttons.push([{ text: '1️⃣ My Consultations', callback_data: 'consultation' }]);
  }
  
  buttons.push([{ text: '2️⃣ Profile & Roles', callback_data: 'profile' }]);
  
  if (hasOtherRoles) {
    buttons.push([{ text: '3️⃣ Switch Role', callback_data: 'switch_role' }]);
  }
  
  return { reply_markup: { inline_keyboard: buttons } };
};

const buildPersonaSelect = (currentPersona, approvedRoles = []) => {
  const buttons = [];
  const roleLabels = {
    patient: { text: '1️⃣ Patient Mode', data: 'patient' },
    caregiver: { text: '2️⃣ Caregiver Mode', data: 'caregiver' },
    doctor: { text: '3️⃣ Doctor Mode', data: 'doctor' },
    admin: { text: '4️⃣ Admin Mode', data: 'admin' },
    super_admin: { text: '4️⃣ Admin Mode', data: 'super_admin' },
    support: { text: '5️⃣ Support Mode', data: 'support' }
  };
  
  approvedRoles.forEach(role => {
    if (roleLabels[role]) {
      buttons.push([{ text: roleLabels[role].text, callback_data: roleLabels[role].data }]);
    }
  });
  
  buttons.push([{ text: '0️⃣ Main Menu', callback_data: 'main_menu' }]);
  
  return {
    reply_markup: { inline_keyboard: buttons },
    text: `👤 *Select Your Role*\n\nCurrent: ${currentPersona || 'Patient'}`
  };
};

const buildProfileMenu = (highlightMissing = {}) => {
  const buttons = [];
  
  buttons.push([{ text: '1️⃣ View Profile', callback_data: 'view_profile' }]);
  
  if (highlightMissing.name) {
    buttons.push([{ text: '🔴 2️⃣ Edit Profile', callback_data: 'edit_profile' }]);
  } else {
    buttons.push([{ text: '2️⃣ Edit Profile', callback_data: 'edit_profile' }]);
  }
  
  buttons.push([{ text: '3️⃣ Apply for Role', callback_data: 'apply_role' }]);
  buttons.push([{ text: '4️⃣ My Roles', callback_data: 'my_roles' }]);
  buttons.push([{ text: '5️⃣ Remove Role', callback_data: 'remove_role' }]);
  buttons.push([{ text: '0️⃣ Back to Profile', callback_data: 'main_menu' }]);
  
  return { reply_markup: { inline_keyboard: buttons } };
};

const buildAdminMenu = (pending = 0, active = 0, isProfileComplete = true, hasPendingPayments = false, hasPendingDiscounts = false, pendingRoles = 0, pendingDoctors = 0) => {
  const buttons = [];
  
  let indicatorOption = 0;
  if (hasPendingDiscounts) indicatorOption = 8;
  else if (hasPendingPayments) indicatorOption = 7;
  else if (!isProfileComplete) indicatorOption = 5;
  else if (pending > 0) indicatorOption = 1;
  else if (pendingRoles > 0) indicatorOption = 3;
  else if (pendingDoctors > 0) indicatorOption = 4;
  
  const showIndicator = (opt) => indicatorOption === opt;
  
  buttons.push([{ text: pending > 0 && showIndicator(1) ? '🔴 1️⃣ Pending Requests' : '1️⃣ Pending Requests', callback_data: 'pending_requests' }]);
  buttons.push([{ text: active > 0 ? '🟢 2️⃣ Active Consultations' : '2️⃣ Active Consultations', callback_data: 'active_consultations' }]);
  buttons.push([{ text: '3️⃣ Role Approvals', callback_data: 'role_approvals' }]);
  buttons.push([{ text: '4️⃣ Doctor Management', callback_data: 'doctor_management' }]);
  buttons.push([{ text: !isProfileComplete && showIndicator(5) ? '🔴 5️⃣ Profile' : '5️⃣ Profile', callback_data: 'profile' }]);
  buttons.push([{ text: '6️⃣ View Patient Profiles', callback_data: 'view_patients' }]);
  buttons.push([{ text: hasPendingPayments && showIndicator(7) ? '🔴 7️⃣ Verify Payment' : '7️⃣ Verify Payment', callback_data: 'verify_payment' }]);
  buttons.push([{ text: hasPendingDiscounts && showIndicator(8) ? '🔴 8️⃣ Verify Discount' : '8️⃣ Verify Discount', callback_data: 'verify_discount' }]);
  buttons.push([{ text: '9️⃣ Message Patient', callback_data: 'message_patient' }]);
  buttons.push([{ text: '🔟 Close Consultation', callback_data: 'close_consultation' }]);
  buttons.push([{ text: '13️⃣ Set Fee', callback_data: 'set_fee' }]);
  buttons.push([{ text: '0️⃣ Switch Role', callback_data: 'switch_role' }]);
  
  return { reply_markup: { inline_keyboard: buttons } };
};

const buildSuperAdminMenu = (pending = 0, active = 0, isProfileComplete = true, hasPendingPayments = false, hasPendingDiscounts = false, pendingRoles = 0, pendingDoctors = 0) => {
  const buttons = [];
  
  let indicatorOption = 0;
  if (hasPendingDiscounts) indicatorOption = 8;
  else if (hasPendingPayments) indicatorOption = 7;
  else if (!isProfileComplete) indicatorOption = 5;
  else if (pending > 0) indicatorOption = 1;
  else if (pendingRoles > 0) indicatorOption = 3;
  else if (pendingDoctors > 0) indicatorOption = 4;
  
  const showIndicator = (opt) => indicatorOption === opt;
  
  buttons.push([{ text: pending > 0 && showIndicator(1) ? `🔴 1️⃣ Pending Requests (${pending} pending)` : `1️⃣ Pending Requests (${pending} pending)`, callback_data: 'pending_requests' }]);
  buttons.push([{ text: active > 0 ? `🟢 2️⃣ Active Consultations (${active} active)` : `2️⃣ Active Consultations (${active} active)`, callback_data: 'active_consultations' }]);
  buttons.push([{ text: '3️⃣ Role Approvals', callback_data: 'role_approvals' }]);
  buttons.push([{ text: '4️⃣ Doctor Management', callback_data: 'doctor_management' }]);
  buttons.push([{ text: !isProfileComplete && showIndicator(5) ? '🔴 5️⃣ Profile' : '5️⃣ Profile', callback_data: 'profile' }]);
  buttons.push([{ text: '6️⃣ View All Patients', callback_data: 'view_all_patients' }]);
  buttons.push([{ text: hasPendingPayments && showIndicator(7) ? '🔴 7️⃣ Verify Payment' : '7️⃣ Verify Payment', callback_data: 'verify_payment' }]);
  buttons.push([{ text: hasPendingDiscounts && showIndicator(8) ? '🔴 8️⃣ Verify Discount' : '8️⃣ Verify Discount', callback_data: 'verify_discount' }]);
  buttons.push([{ text: '9️⃣ Message Patient', callback_data: 'message_patient' }]);
  buttons.push([{ text: '🔟 Close Consultation', callback_data: 'close_consultation' }]);
  buttons.push([{ text: '1️⃣1 Add Admin', callback_data: 'add_admin' }]);
  buttons.push([{ text: '1️⃣2 Remove Admin', callback_data: 'remove_admin' }]);
  buttons.push([{ text: '0️⃣ Switch Role', callback_data: 'switch_role' }]);
  
  return { reply_markup: { inline_keyboard: buttons } };
};

const buildCancerTypeMenu = () => {
  const buttons = [
    [{ text: '1️⃣ Lung Cancer', callback_data: 'cancer_lung' }, { text: '2️⃣ Breast Cancer', callback_data: 'cancer_breast' }, { text: '3️⃣ Prostate Cancer', callback_data: 'cancer_prostate' }],
    [{ text: '4️⃣ Liver Cancer', callback_data: 'cancer_liver' }, { text: '5️⃣ Pancreatic', callback_data: 'cancer_pancreatic' }, { text: '6️⃣ Ovarian', callback_data: 'cancer_ovarian' }],
    [{ text: '7️⃣ Blood Cancer', callback_data: 'cancer_blood' }, { text: '8️⃣ Other/General', callback_data: 'cancer_other' }],
    [{ text: '0️⃣ Cancel', callback_data: 'cancel' }]
  ];
  return { reply_markup: { inline_keyboard: buttons } };
};

const buildConsultationMenu = (profileComplete = false) => {
  const buttons = [];
  
  if (!profileComplete) {
    buttons.push([{ text: '🔴 1️⃣ Start New Consultation', callback_data: 'start_consultation' }]);
    buttons.push([{ text: '⚠️ 2️⃣ Check Payment Status', callback_data: 'payment_status' }]);
  } else {
    buttons.push([{ text: '1️⃣ Start New Consultation', callback_data: 'start_consultation' }]);
    buttons.push([{ text: '2️⃣ Check Payment Status', callback_data: 'payment_status' }]);
  }
  
  buttons.push([{ text: '3️⃣ Withdraw Consultation', callback_data: 'withdraw' }]);
  buttons.push([{ text: '4️⃣ Back to Menu', callback_data: 'main_menu' }]);
  
  return { reply_markup: { inline_keyboard: buttons } };
};

const buildRoleSelect = () => {
  const buttons = [
    [{ text: '1️⃣ Patient', callback_data: 'patient' }],
    [{ text: '2️⃣ Caregiver', callback_data: 'caregiver' }],
    [{ text: '3️⃣ Doctor', callback_data: 'doctor' }],
    [{ text: '4️⃣ Admin', callback_data: 'admin' }],
    [{ text: '5️⃣ Support', callback_data: 'support' }]
  ];
  return { reply_markup: { inline_keyboard: buttons } };
};

const buildCaregiverAuth = () => ({ reply_markup: { inline_keyboard: [[{ text: '1️⃣ Yes, I am the patient', callback_data: 'caregiver_yes' }, { text: '2️⃣ No, I am a caregiver', callback_data: 'caregiver_no' }]] } });

const buildPlatformTerms = () => ({ reply_markup: { inline_keyboard: [[{ text: '1️⃣ I Agree', callback_data: 'terms_accept' }, { text: '2️⃣ Decline', callback_data: 'terms_decline' }]] } });

const buildProfileView = (profile = {}) => ({ reply_markup: { inline_keyboard: [[{ text: '1️⃣ View Profile', callback_data: 'view_profile' }]] } });

const buildProfileEdit = () => ({ reply_markup: { inline_keyboard: [[{ text: '1️⃣ Edit Name', callback_data: 'edit_name' }, { text: '2️⃣ Edit Phone', callback_data: 'edit_phone' }]] } });

const buildRoleApplication = () => ({ reply_markup: { inline_keyboard: [[{ text: 'Apply for Role', callback_data: 'apply_role' }]] } });

const buildMyRoles = (roles = [], profile = {}) => ({ reply_markup: { inline_keyboard: roles.map(r => [{ text: r, callback_data: `role_${r}` }]) } });

const buildProfileRemoveRole = () => ({ reply_markup: { inline_keyboard: [[{ text: 'doctor', callback_data: 'remove_doctor' }, { text: 'caregiver', callback_data: 'remove_caregiver' }, { text: 'support', callback_data: 'remove_support' }, { text: '0️⃣ Cancel', callback_data: 'cancel' }]] } });

const buildDiscountCategories = () => ({ reply_markup: { inline_keyboard: [[{ text: 'Aadhaar', callback_data: 'discount_aadhaar' }, { text: 'Ayushman', callback_data: 'discount_ayushman' }]] } });

const buildConsentsMenu = () => ({ reply_markup: { inline_keyboard: [[{ text: '✅ Teleconsultation', callback_data: 'consent_tele' }, { text: '✅ Data Sharing', callback_data: 'consent_data' }, { text: '✅ DPDP', callback_data: 'consent_dpdp' }]] } });

const buildDoctorSelect = (doctors = []) => ({ reply_markup: { inline_keyboard: doctors.map(d => [{ text: d.name || 'Doctor', callback_data: `doctor_${d.id}` }]) } });

const buildConsultationCompleted = () => ({ reply_markup: { inline_keyboard: [[{ text: '1️⃣ View Details', callback_data: 'consultation_details' }, { text: '2️⃣ Rate Experience', callback_data: 'rate_consultation' }, { text: '0️⃣ Main Menu', callback_data: 'main_menu' }]] } });

const buildCloseConsultationPrompt = () => ({ reply_markup: { inline_keyboard: [[{ text: '✅ Yes, Close', callback_data: 'close_confirm' }, { text: '❌ No, Keep Open', callback_data: 'close_cancel' }]] } });

const buildMobileCollection = () => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Skip', callback_data: 'mobile_skip' }]] } });

const buildCaregiverPatientLink = () => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Switch Role', callback_data: 'switch_role' }]] } });

const buildAdminProfileEdit = () => ({ reply_markup: { inline_keyboard: [[{ text: '1️⃣ Edit Name', callback_data: 'edit_name' }, { text: '2️⃣ Edit Phone', callback_data: 'edit_phone' }, { text: '0️⃣ Cancel', callback_data: 'cancel' }]] } });

const buildAdminProfileEditName = () => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Cancel', callback_data: 'cancel' }]] } });

const buildAdminProfileEditPhone = () => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Cancel', callback_data: 'cancel' }]] } });

const buildDoctorProfileEdit = () => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Cancel', callback_data: 'cancel' }]] } });

const buildDoctorMsgAdminInput = () => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Back to Doctor Menu', callback_data: 'doctor_menu' }]] } });

const buildAdminAssignDoctorInput = () => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Back to Doctor Management', callback_data: 'doctor_management' }]] } });

const buildAdminRemoveDoctorInput = () => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Back to Doctor Management', callback_data: 'doctor_management' }]] } });

const buildAdminRejectDoctorInput = () => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Back to Doctor Management', callback_data: 'doctor_management' }]] } });

const buildAdminMessageDoctorInput = () => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Back to Doctor Management', callback_data: 'doctor_management' }]] } });

const buildAdminReassignDoctorInput = () => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Back to Doctor Management', callback_data: 'doctor_management' }]] } });

const buildAdminMessagePatientInput = () => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Back to Admin Menu', callback_data: 'admin_menu' }]] } });

const buildAdminVerifyPaymentInput = () => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Back to Admin Menu', callback_data: 'admin_menu' }]] } });

const buildAdminVerifyDiscountInput = () => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Back to Admin Menu', callback_data: 'admin_menu' }]] } });

const buildAdminInviteDoctorInput = () => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Back to Doctor Management', callback_data: 'doctor_management' }]] } });

const buildAdminRegisterDoctorInput = () => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Back to Doctor Management', callback_data: 'doctor_management' }]] } });

const buildAdminApproveDoctorInput = () => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Back to Role Approvals', callback_data: 'role_approvals' }]] } });

const buildAdminApproveCaregiverInput = () => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Back to Role Approvals', callback_data: 'role_approvals' }]] } });

const buildAdminApproveSupportInput = () => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Back to Role Approvals', callback_data: 'role_approvals' }]] } });

const buildAdminAddAdminInput = () => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Back to Super Admin Menu', callback_data: 'super_admin_menu' }]] } });

const buildAdminRemoveAdminInput = () => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Back to Super Admin Menu', callback_data: 'super_admin_menu' }]] } });

const buildAdminSetFeeInput = () => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Back to Admin Menu', callback_data: 'admin_menu' }]] } });

const buildPendingRequests = (count = 0) => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Back to Admin Menu', callback_data: 'admin_menu' }]] } });

const buildActiveConsultations = () => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Back to Admin Menu', callback_data: 'admin_menu' }]] } });

const buildViewAllPatients = (patients = []) => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Back to Super Admin Menu', callback_data: 'super_admin_menu' }]] } });

const buildViewLinkedPatients = (patients = []) => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Switch Role', callback_data: 'switch_role' }]] } });

const buildDoctorStatus = () => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Back to Doctor Menu', callback_data: 'doctor_menu' }]] } });

const buildWithdrawalConfirm = () => ({ reply_markup: { inline_keyboard: [[{ text: '✅ Yes, Withdraw', callback_data: 'withdraw_confirm' }, { text: '❌ Cancel', callback_data: 'withdraw_cancel' }]] } });

const buildReportUpload = () => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Skip', callback_data: 'skip_upload' }]] } });

const buildProfileDiscountDocuments = () => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Skip', callback_data: 'skip_documents' }]] } });

const buildAdminProfileCompleteOptions = (role = 'Admin') => ({
  reply_markup: { inline_keyboard: [[{ text: '1️⃣ Go to Menu', callback_data: 'go_to_menu' }, { text: '2️⃣ Continue Editing', callback_data: 'continue_edit' }, { text: '3️⃣ Cancel', callback_data: 'cancel' }]] },
  text: `👤 *Profile Complete*\n\n${role} profile is now complete. What would you like to do?`
});

const buildAdminRoleApprovals = (pending = 0) => ({
  reply_markup: { inline_keyboard: [
    [{ text: '1️⃣ View Role Applications', callback_data: 'view_role_apps' }],
    [{ text: '2️⃣ Approve Doctor', callback_data: 'approve_doctor' }],
    [{ text: '3️⃣ Approve Caregiver', callback_data: 'approve_caregiver' }],
    [{ text: '4️⃣ Approve Support', callback_data: 'approve_support' }],
    [{ text: '0️⃣ Back to Admin Menu', callback_data: 'admin_menu' }]
  ]}
});

const buildDoctorMenu = (name = 'Doctor', hasActive = false, pendingActions = 0) => ({
  reply_markup: { inline_keyboard: [
    [{ text: hasActive ? '🟢 1️⃣ Status' : '1️⃣ Status', callback_data: 'doctor_status' }],
    [{ text: '2️⃣ My Patients', callback_data: 'my_patients' }],
    [{ text: '3️⃣ Edit Profile', callback_data: 'edit_profile' }],
    [{ text: '4️⃣ Message Admin', callback_data: 'message_admin' }]
  ]}
});

module.exports = {
  buildMainMenu,
  buildPersonaSelect,
  buildAdminMenu,
  buildSuperAdminMenu,
  buildCancerTypeMenu,
  buildConsultationMenu,
  buildDoctorMenu,
  buildRoleSelect,
  buildCaregiverAuth,
  buildPlatformTerms,
  buildProfileView,
  buildProfileEdit,
  buildRoleApplication,
  buildMyRoles,
  buildProfileRemoveRole,
  buildDiscountCategories,
  buildConsentsMenu,
  buildDoctorSelect,
  buildConsultationCompleted,
  buildCloseConsultationPrompt,
  buildMobileCollection,
  buildCaregiverPatientLink,
  buildAdminProfileEdit,
  buildAdminProfileEditName,
  buildAdminProfileEditPhone,
  buildDoctorProfileEdit,
  buildDoctorMsgAdminInput,
  buildAdminAssignDoctorInput,
  buildAdminRemoveDoctorInput,
  buildAdminRejectDoctorInput,
  buildAdminMessageDoctorInput,
  buildAdminReassignDoctorInput,
  buildAdminMessagePatientInput,
  buildAdminVerifyPaymentInput,
  buildAdminVerifyDiscountInput,
  buildAdminInviteDoctorInput,
  buildAdminRegisterDoctorInput,
  buildAdminApproveDoctorInput,
  buildAdminApproveCaregiverInput,
  buildAdminApproveSupportInput,
  buildAdminAddAdminInput,
  buildAdminRemoveAdminInput,
  buildAdminSetFeeInput,
  buildPendingRequests,
  buildActiveConsultations,
  buildViewAllPatients,
  buildViewLinkedPatients,
  buildDoctorStatus,
  buildWithdrawalConfirm,
  buildReportUpload,
  buildProfileDiscountDocuments,
  buildAdminProfileCompleteOptions,
  buildAdminRoleApprovals
};