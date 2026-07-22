const { FlowStates } = require('./conversationFlow');

const MAX_FILE_SIZE_MB = 20;

const buildMainMenu = (persona = 'patient', hasOtherRoles = false, profileComplete = true, isAdmin = false, isSuperAdmin = false, pendingCount = 0, activeCount = 0) => {
  const buttons = [];
  
  if (activeCount > 0 || pendingCount > 0) {
    buttons.push([{ text: '🟢 1️⃣ My Consultations', callback_data: 'consultation' }]);
  } else {
    buttons.push([{ text: '1️⃣ My Consultations', callback_data: 'consultation' }]);
  }

  if (!profileComplete) {
    buttons.push([{ text: '🔴 2️⃣ Profile & Roles', callback_data: 'profile' }]);
  } else {
    buttons.push([{ text: '2️⃣ Profile & Roles', callback_data: 'profile' }]);
  }
  
  if (hasOtherRoles) {
    buttons.push([{ text: '3️⃣ Switch Role', callback_data: 'switch_role' }]);
  }
  
  return { reply_markup: { inline_keyboard: buttons } };
};

const buildCaregiverMenu = (hasOtherRoles = false, profileComplete = true, pendingCount = 0, activeCount = 0) => {
  const buttons = [];
  if (activeCount > 0 || pendingCount > 0) {
    buttons.push([{ text: '🟢 1️⃣ My Consultations', callback_data: 'consultation' }]);
  } else {
    buttons.push([{ text: '1️⃣ My Consultations', callback_data: 'consultation' }]);
  }

  if (!profileComplete) {
    buttons.push([{ text: '🔴 2️⃣ Profile & Roles', callback_data: 'profile' }]);
  } else {
    buttons.push([{ text: '2️⃣ Profile & Roles', callback_data: 'profile' }]);
  }
  if (hasOtherRoles) {
    buttons.push([{ text: '0️⃣ Switch Role', callback_data: 'switch_role' }]);
  }
  return { reply_markup: { inline_keyboard: buttons } };
};

const buildSupportMenu = (hasOtherRoles = false) => {
  const buttons = [];
  buttons.push([{ text: '1️⃣ My Consultations', callback_data: 'active_consultations' }]);
  buttons.push([{ text: '2️⃣ Doctor Chat', callback_data: 'message_doctor' }]);
  buttons.push([{ text: '3️⃣ Patient Chat', callback_data: 'message_patient' }]);
  buttons.push([{ text: '4️⃣ Profile', callback_data: 'profile' }]);
  if (hasOtherRoles) {
    buttons.push([{ text: '0️⃣ Switch Role', callback_data: 'switch_role' }]);
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

const buildAdminConsultationsMenu = (pending = 0, active = 0) => {
  const buttons = [];
  buttons.push([{ text: pending > 0 ? `🔴 1️⃣ Pending Requests (${pending} pending)` : `1️⃣ Pending Requests (${pending} pending)`, callback_data: 'pending_requests' }]);
  buttons.push([{ text: active > 0 ? `🟢 2️⃣ Active Consultations (${active} active)` : `2️⃣ Active Consultations (${active} active)`, callback_data: 'active_consultations' }]);
  buttons.push([{ text: '3️⃣ View Patient Profiles', callback_data: 'view_patients' }]);
  buttons.push([{ text: '4️⃣ Message Patient', callback_data: 'message_patient' }]);
  buttons.push([{ text: '5️⃣ Close Consultation', callback_data: 'close_consultation' }]);
  buttons.push([{ text: '0️⃣ Back to Admin Menu', callback_data: 'admin_menu' }]);
  return { reply_markup: { inline_keyboard: buttons } };
};

const buildAdminFinancesMenu = (hasPendingPayments = false, hasPendingDiscounts = false) => {
  const buttons = [];
  buttons.push([{ text: hasPendingPayments ? '🔴 1️⃣ Verify Payment' : '1️⃣ Verify Payment', callback_data: 'verify_payment' }]);
  buttons.push([{ text: hasPendingDiscounts ? '🔴 2️⃣ Verify Discount' : '2️⃣ Verify Discount', callback_data: 'verify_discount' }]);
  buttons.push([{ text: '3️⃣ Set Fee', callback_data: 'set_fee' }]);
  buttons.push([{ text: '0️⃣ Back to Admin Menu', callback_data: 'admin_menu' }]);
  return { reply_markup: { inline_keyboard: buttons } };
};

const buildAdminSystemMenu = (pendingRoles = 0, pendingDoctors = 0, isSuperAdmin = false) => {
  const buttons = [];
  buttons.push([{ text: pendingRoles > 0 ? '🔴 1️⃣ Role Approvals' : '1️⃣ Role Approvals', callback_data: 'role_approvals' }]);
  buttons.push([{ text: pendingDoctors > 0 ? '🔴 2️⃣ Doctor Management' : '2️⃣ Doctor Management', callback_data: 'doctor_management' }]);
  if (isSuperAdmin) {
    buttons.push([{ text: '3️⃣ Manage Admins', callback_data: 'manage_admins' }]);
  }
  buttons.push([{ text: '0️⃣ Back to Admin Menu', callback_data: 'admin_menu' }]);
  return { reply_markup: { inline_keyboard: buttons } };
};

const buildAdminMenu = (pending = 0, active = 0, isProfileComplete = true, hasPendingPayments = false, hasPendingDiscounts = false, pendingRoles = 0, pendingDoctors = 0) => {
  const buttons = [];
  const hasConsultationAction = pending > 0 || active > 0;
  const hasFinanceAction = hasPendingPayments || hasPendingDiscounts;
  const hasSystemAction = pendingRoles > 0 || pendingDoctors > 0;
  
  buttons.push([{ text: hasConsultationAction ? '🔴 1️⃣ Consultations' : '1️⃣ Consultations', callback_data: 'menu_consultations' }]);
  buttons.push([{ text: hasFinanceAction ? '🔴 2️⃣ Finances' : '2️⃣ Finances', callback_data: 'menu_finances' }]);
  buttons.push([{ text: hasSystemAction ? '🔴 3️⃣ System & Roles' : '3️⃣ System & Roles', callback_data: 'menu_system' }]);
  buttons.push([{ text: !isProfileComplete ? '🔴 4️⃣ My Profile' : '4️⃣ My Profile', callback_data: 'profile' }]);
  buttons.push([{ text: '0️⃣ Switch Role', callback_data: 'switch_role' }]);
  
  return { reply_markup: { inline_keyboard: buttons } };
};

const buildSuperAdminManageAdminsMenu = () => {
  const buttons = [];
  buttons.push([{ text: '1️⃣ Add Admin', callback_data: 'add_admin' }]);
  buttons.push([{ text: '2️⃣ Remove Admin', callback_data: 'remove_admin' }]);
  buttons.push([{ text: '0️⃣ Back to System Menu', callback_data: 'menu_system' }]);
  return { reply_markup: { inline_keyboard: buttons } };
};

const buildSuperAdminMenu = (pending = 0, active = 0, isProfileComplete = true, hasPendingPayments = false, hasPendingDiscounts = false, pendingRoles = 0, pendingDoctors = 0) => {
  const buttons = [];
  const hasConsultationAction = pending > 0 || active > 0;
  const hasFinanceAction = hasPendingPayments || hasPendingDiscounts;
  const hasSystemAction = pendingRoles > 0 || pendingDoctors > 0;
  
  buttons.push([{ text: hasConsultationAction ? '🔴 1️⃣ Consultations' : '1️⃣ Consultations', callback_data: 'menu_consultations' }]);
  buttons.push([{ text: hasFinanceAction ? '🔴 2️⃣ Finances' : '2️⃣ Finances', callback_data: 'menu_finances' }]);
  buttons.push([{ text: hasSystemAction ? '🔴 3️⃣ System & Roles' : '3️⃣ System & Roles', callback_data: 'menu_system' }]);
  buttons.push([{ text: !isProfileComplete ? '🔴 4️⃣ My Profile' : '4️⃣ My Profile', callback_data: 'profile' }]);
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
    [{ text: '0️⃣ Cancel', callback_data: 'cancel' }]
  ];
  return { reply_markup: { inline_keyboard: buttons } };
};

const buildCaregiverAuth = () => ({ reply_markup: { inline_keyboard: [[{ text: '1️⃣ Yes, I am the patient', callback_data: 'caregiver_yes' }, { text: '2️⃣ No, I am a caregiver', callback_data: 'caregiver_no' }]] } });

const buildPlatformTerms = () => ({ reply_markup: { inline_keyboard: [[{ text: '1️⃣ I Agree', callback_data: 'terms_accept' }, { text: '2️⃣ Decline', callback_data: 'terms_decline' }]] } });

const buildProfileView = (profile = {}) => ({ reply_markup: { inline_keyboard: [
  [{ text: '1️⃣ View Profile', callback_data: 'view_profile' }],
  [{ text: '2️⃣ Edit Profile', callback_data: 'edit_profile' }],
  [{ text: '3️⃣ Apply for Role', callback_data: 'apply_role' }],
  [{ text: '4️⃣ My Roles', callback_data: 'my_roles' }],
  [{ text: '5️⃣ Remove Role', callback_data: 'remove_role' }],
  [{ text: '0️⃣ Back to Menu', callback_data: 'main_menu' }]
] } });

const buildProfileEdit = () => ({ reply_markup: { inline_keyboard: [[{ text: '1️⃣ Edit Name', callback_data: 'edit_name' }, { text: '2️⃣ Edit Phone', callback_data: 'edit_phone' }]] } });

const buildRoleApplication = () => ({ reply_markup: { inline_keyboard: [
  [{ text: '1️⃣ Doctor', callback_data: 'apply_doctor' }],
  [{ text: '2️⃣ Caregiver', callback_data: 'apply_caregiver' }],
  [{ text: '3️⃣ Support', callback_data: 'apply_support' }],
  [{ text: '4️⃣ Cancel', callback_data: 'cancel' }]
] } });

const buildMyRoles = (roles = [], profile = {}) => ({ reply_markup: { inline_keyboard: roles.map(r => [{ text: r, callback_data: `role_${r}` }]) } });

const buildProfileRemoveRole = () => ({ reply_markup: { inline_keyboard: [[{ text: 'doctor', callback_data: 'remove_doctor' }, { text: 'caregiver', callback_data: 'remove_caregiver' }, { text: 'support', callback_data: 'remove_support' }, { text: '0️⃣ Cancel', callback_data: 'cancel' }]] } });

const buildDiscountPrimary = () => ({ reply_markup: { inline_keyboard: [
  [{ text: '1️⃣ Economic & Schemes', callback_data: 'discount_economic' }],
  [{ text: '2️⃣ Profession & Service', callback_data: 'discount_profession' }],
  [{ text: '3️⃣ Social & Demographic', callback_data: 'discount_social' }],
  [{ text: '4️⃣ No Discount (Full Fee)', callback_data: 'discount_none' }]
] } });

const buildDiscountEconomic = () => ({ reply_markup: { inline_keyboard: [
  [{ text: '1️⃣ BPL / EWS', callback_data: 'discount_1' }],
  [{ text: '2️⃣ Ayushman Bharat (PM-JAY)', callback_data: 'discount_2' }],
  [{ text: '3️⃣ e-Shram (Unorganized Sector)', callback_data: 'discount_3' }],
  [{ text: '4️⃣ Farmer', callback_data: 'discount_4' }],
  [{ text: '5️⃣ Rural/Tribal Resident', callback_data: 'discount_15' }],
  [{ text: '0️⃣ Back', callback_data: 'discount_back' }]
] } });

const buildDiscountProfession = () => ({ reply_markup: { inline_keyboard: [
  [{ text: '1️⃣ Defence / Ex-servicemen', callback_data: 'discount_5' }],
  [{ text: '2️⃣ Paramilitary', callback_data: 'discount_6' }],
  [{ text: '3️⃣ Police', callback_data: 'discount_7' }],
  [{ text: '4️⃣ Government Employee', callback_data: 'discount_8' }],
  [{ text: '5️⃣ Healthcare Worker', callback_data: 'discount_16' }],
  [{ text: '6️⃣ Teacher / Anganwadi', callback_data: 'discount_17' }],
  [{ text: '7️⃣ Journalist', callback_data: 'discount_18' }],
  [{ text: '0️⃣ Back', callback_data: 'discount_back' }]
] } });

const buildDiscountSocial = () => ({ reply_markup: { inline_keyboard: [
  [{ text: '1️⃣ Senior Citizen / Retiree', callback_data: 'discount_9' }],
  [{ text: '2️⃣ Widow / Single Woman', callback_data: 'discount_11' }],
  [{ text: '3️⃣ PwD (UDID)', callback_data: 'discount_12' }],
  [{ text: '4️⃣ SC/ST', callback_data: 'discount_13' }],
  [{ text: '5️⃣ Minority Community', callback_data: 'discount_14' }],
  [{ text: '0️⃣ Back', callback_data: 'discount_back' }]
] } });

const buildConsentsMenu = () => ({ reply_markup: { inline_keyboard: [[{ text: '✅ Teleconsultation', callback_data: 'consent_tele' }, { text: '✅ Data Sharing', callback_data: 'consent_data' }, { text: '✅ DPDP', callback_data: 'consent_dpdp' }]] } });

const buildDoctorSelect = (doctors = []) => {
  const buttons = doctors.map(d => [{ text: d.name || 'Doctor', callback_data: `doctor_${d.id}` }]);
  buttons.push([{ text: '0️⃣ Back to Menu', callback_data: 'main_menu' }]);
  return { reply_markup: { inline_keyboard: buttons } };
};

const buildConsultationCompleted = () => ({ reply_markup: { inline_keyboard: [
  [{ text: '1️⃣ My Consultations', callback_data: 'consultation' }],
  [{ text: '2️⃣ View Profile', callback_data: 'view_profile' }],
  [{ text: '3️⃣ Main Menu', callback_data: 'main_menu' }]
] } });

const buildCloseConsultationPrompt = () => ({ reply_markup: { inline_keyboard: [[{ text: '✅ Yes, Close', callback_data: 'close_confirm' }, { text: '❌ No, Keep Open', callback_data: 'close_cancel' }]] } });

const buildMobileCollection = () => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Skip', callback_data: 'mobile_skip' }]] } });

const buildCaregiverPatientLink = () => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Switch Role', callback_data: 'switch_role' }]] } });

const buildAdminProfileEdit = (missingFields = []) => {
  const missingNames = missingFields.map(f => f.toLowerCase());
  const hasMissingName = missingNames.includes('name');
  const hasMissingPhone = missingNames.includes('phone') || missingNames.includes('phonenumber');
  
  return { reply_markup: { inline_keyboard: [
    [{ text: hasMissingName ? '🔴 1️⃣ Edit Name' : '1️⃣ Edit Name', callback_data: 'edit_name' }],
    [{ text: hasMissingPhone ? '🔴 2️⃣ Edit Phone' : '2️⃣ Edit Phone', callback_data: 'edit_phone' }],
    [{ text: '3️⃣ View Profile', callback_data: 'view_profile' }],
    [{ text: '0️⃣ Back to Profile', callback_data: 'cancel' }]
  ] } };
};

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

const buildAdminRoleApprovals = (pendingCounts = { doctor: 0, caregiver: 0, support: 0 }) => ({
  reply_markup: { inline_keyboard: [
    [{ text: '1️⃣ View Role Applications', callback_data: 'view_role_apps' }],
    [{ text: pendingCounts.doctor > 0 ? `🔴 2️⃣ Approve Doctor (${pendingCounts.doctor} pending)` : '2️⃣ Approve Doctor', callback_data: 'approve_doctor' }],
    [{ text: pendingCounts.caregiver > 0 ? `🔴 3️⃣ Approve Caregiver (${pendingCounts.caregiver} pending)` : '3️⃣ Approve Caregiver', callback_data: 'approve_caregiver' }],
    [{ text: pendingCounts.support > 0 ? `🔴 4️⃣ Approve Support (${pendingCounts.support} pending)` : '4️⃣ Approve Support', callback_data: 'approve_support' }],
    [{ text: '0️⃣ Back to Admin Menu', callback_data: 'admin_menu' }]
  ]}
});

const buildBillingMenu = () => ({
  reply_markup: { inline_keyboard: [
    [{ text: '1️⃣ Check Payment Status', callback_data: 'payment_status' }],
    [{ text: '0️⃣ Main Menu', callback_data: 'main_menu' }]
  ]}
});

const buildAdminDoctorManagement = (pendingDocs = 0) => ({
  reply_markup: { inline_keyboard: [
    [{ text: '1️⃣ View Doctors', callback_data: 'view_doctors' }],
    [{ text: '2️⃣ Invite Doctor', callback_data: 'invite_doctor' }],
    [{ text: pendingDocs > 0 ? `🔴 3️⃣ Register Doctor (${pendingDocs} pending)` : '3️⃣ Register Doctor', callback_data: 'register_doctor' }],
    [{ text: '4️⃣ Assign Doctor', callback_data: 'assign_doctor' }],
    [{ text: '5️⃣ Remove Doctor', callback_data: 'remove_doctor' }],
    [{ text: '6️⃣ Reject Doctor', callback_data: 'reject_doctor' }],
    [{ text: '7️⃣ Message Doctor', callback_data: 'message_doctor' }],
    [{ text: '8️⃣ Reassign Doctor', callback_data: 'reassign_doctor' }],
    [{ text: '0️⃣ Back to Admin Menu', callback_data: 'admin_menu' }]
  ]}
});

const buildDoctorMenu = (name = 'Doctor', hasActive = false, pendingActions = 0) => ({
  reply_markup: { inline_keyboard: [
    [{ text: hasActive ? '🟢 1️⃣ Status' : '1️⃣ Status', callback_data: 'doctor_status' }],
    [{ text: '2️⃣ My Patients', callback_data: 'my_patients' }],
    [{ text: '3️⃣ Edit Profile', callback_data: 'edit_profile' }],
    [{ text: pendingActions > 0 ? `🔴 4️⃣ Message Admin (${pendingActions} unread)` : '4️⃣ Message Admin', callback_data: 'message_admin' }]
  ]}
});

module.exports = {
  buildMainMenu,
  buildCaregiverMenu,
  buildSupportMenu,
  buildPersonaSelect,
  buildAdminMenu,
  buildSuperAdminMenu,
  buildSuperAdminManageAdminsMenu,
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
  buildDiscountPrimary,
  buildDiscountEconomic,
  buildDiscountProfession,
  buildDiscountSocial,
  buildConsentsMenu,
  buildDoctorSelect,
  buildConsultationCompleted,
  buildCloseConsultationPrompt,
  buildMobileCollection,
  buildCaregiverPatientLink,
  buildAdminProfileEdit,
  buildAdminProfileEditName,
  buildAdminProfileEditPhone,
  buildAdminConsultationsMenu,
  buildAdminFinancesMenu,
  buildAdminSystemMenu,
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
  buildAdminRoleApprovals,
  buildAdminDoctorManagement,
  buildBillingMenu
};