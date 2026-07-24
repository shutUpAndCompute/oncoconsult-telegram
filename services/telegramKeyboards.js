const { FlowStates } = require('./conversationFlow');
const menuTree = require('./menuTree');
const { renderKeyboard } = require('./menuTreeRenderer');

const MAX_FILE_SIZE_MB = 20;

// Seeded/registered doctor names sometimes already include a "Dr." prefix
// (see data/doctors.json) and sometimes don't - strip it before display so
// button labels don't ever read "Dr. Dr. Name".
const formatDoctorName = (name) => String(name || '').replace(/^Dr\.?\s*/i, '');

// isAdmin/isSuperAdmin are accepted for call-site symmetry with
// buildAdminMenu/buildSuperAdminMenu but intentionally unused here - this is
// always the generic patient-shaped menu (Consultations/Profile/Switch
// Role). Admin/doctor/support roles must be routed to their own
// buildAdminMenu/buildSuperAdminMenu/buildDoctorMenu/buildSupportMenu
// instead of this function.
const patientMenuFacts = (hasOtherRoles, profileComplete, pendingCount, activeCount) => ({
  hasOtherRoles, isProfileComplete: profileComplete,
  hasPendingConsultation: pendingCount > 0, hasActiveConsultation: activeCount > 0,
  hasMissingProfileFields: !profileComplete
});

const buildMainMenu = (persona = 'patient', hasOtherRoles = false, profileComplete = true, isAdmin = false, isSuperAdmin = false, pendingCount = 0, activeCount = 0) =>
  renderKeyboard(menuTree.patientRoot, patientMenuFacts(hasOtherRoles, profileComplete, pendingCount, activeCount));

const buildCaregiverMenu = (hasOtherRoles = false, profileComplete = true, pendingCount = 0, activeCount = 0) =>
  renderKeyboard(menuTree.caregiverRoot, patientMenuFacts(hasOtherRoles, profileComplete, pendingCount, activeCount));

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
  const hasMissing = Object.keys(highlightMissing).length > 0;

  buttons.push([{ text: '1️⃣ View Profile', callback_data: 'view_profile' }]);

  if (hasMissing) {
    buttons.push([{ text: '🔴 2️⃣ Edit Profile', callback_data: 'edit_profile' }]);
    buttons.push([{ text: '🔴 3️⃣ Apply for Role', callback_data: 'apply_role' }]);
  } else {
    buttons.push([{ text: '2️⃣ Edit Profile', callback_data: 'edit_profile' }]);
    buttons.push([{ text: '3️⃣ Apply for Role', callback_data: 'apply_role' }]);
  }

  buttons.push([{ text: '4️⃣ My Roles', callback_data: 'my_roles' }]);
  buttons.push([{ text: '5️⃣ Remove Role', callback_data: 'remove_role' }]);
  buttons.push([{ text: '0️⃣ Back to Profile', callback_data: 'main_menu' }]);
  
  return { reply_markup: { inline_keyboard: buttons } };
};

const buildAdminConsultationsMenu = (pending = 0, active = 0) =>
  renderKeyboard(menuTree.adminConsultationsMenu, adminMenuFacts(pending, active, true, false, false, 0, 0, false));

const buildAdminFinancesMenu = (hasPendingPayments = false, hasPendingDiscounts = false) =>
  renderKeyboard(menuTree.adminFinancesMenu, adminMenuFacts(0, 0, true, hasPendingPayments, hasPendingDiscounts, 0, 0, false));

const buildAdminSystemMenu = (pendingRoles = 0, pendingDoctors = 0, isSuperAdmin = false) => {
  return renderKeyboard(menuTree.adminSystemMenu, adminMenuFacts(0, 0, true, false, false, pendingRoles, pendingDoctors, isSuperAdmin));
};

// All buildAdmin*/buildSuperAdmin* functions below are thin wrappers over
// services/menuTree.js - the tree (walked by menuTreeRenderer) is the only
// real implementation of the admin menu family's badge logic now. These
// wrappers exist so callers (and this file's existing tests) can keep
// passing simple positional booleans/counts instead of a full live-service
// context; production code (src/servers/telegramBot.js's
// buildKeyboardForState) calls the tree directly with real computed facts
// instead of going through these.
//
// `pendingRoles` here is a single legacy total (the old call sites never
// distinguished doctor/caregiver/support at this level) - mapped onto
// pendingDoctorRoleRequests since only the aggregate ("does System have
// anything pending") matters for cascading up to this root; a caller that
// needs the specific per-role breakdown should render buildAdminRoleApprovals
// directly with a real {doctor,caregiver,support} object instead.
const adminMenuFacts = (pending, active, isProfileComplete, hasPendingPayments, hasPendingDiscounts, pendingRoles, pendingDoctors, isSuperAdmin, missingFields) => ({
  pendingConsultations: pending, activeConsultations: active,
  isAdminProfileComplete: isProfileComplete,
  adminMissingFields: missingFields || (isProfileComplete ? [] : ['Name']),
  hasPendingPayments, hasPendingDiscounts,
  pendingDoctorRoleRequests: pendingRoles, pendingCaregiverRoleRequests: 0, pendingSupportRoleRequests: 0,
  pendingDoctorInvites: pendingDoctors, isSuperAdmin
});

const buildAdminMenu = (pending = 0, active = 0, isProfileComplete = true, hasPendingPayments = false, hasPendingDiscounts = false, pendingRoles = 0, pendingDoctors = 0) =>
  renderKeyboard(menuTree.adminRoot, adminMenuFacts(pending, active, isProfileComplete, hasPendingPayments, hasPendingDiscounts, pendingRoles, pendingDoctors, false));

const buildSuperAdminMenu = (pending = 0, active = 0, isProfileComplete = true, hasPendingPayments = false, hasPendingDiscounts = false, pendingRoles = 0, pendingDoctors = 0) =>
  renderKeyboard(menuTree.adminRoot, adminMenuFacts(pending, active, isProfileComplete, hasPendingPayments, hasPendingDiscounts, pendingRoles, pendingDoctors, true));

const buildSuperAdminManageAdminsMenu = () =>
  renderKeyboard(menuTree.superAdminManageAdmins, adminMenuFacts(0, 0, true, false, false, 0, 0, true));

const buildCancerTypeMenu = () => {
  const buttons = [
    [{ text: '1️⃣ Lung Cancer', callback_data: 'cancer_lung' }, { text: '2️⃣ Breast Cancer', callback_data: 'cancer_breast' }, { text: '3️⃣ Prostate Cancer', callback_data: 'cancer_prostate' }],
    [{ text: '4️⃣ Liver Cancer', callback_data: 'cancer_liver' }, { text: '5️⃣ Pancreatic', callback_data: 'cancer_pancreatic' }, { text: '6️⃣ Ovarian', callback_data: 'cancer_ovarian' }],
    [{ text: '7️⃣ Blood Cancer', callback_data: 'cancer_blood' }, { text: '8️⃣ Other/General', callback_data: 'cancer_other' }],
    [{ text: '0️⃣ Cancel', callback_data: 'cancel' }]
  ];
  return { reply_markup: { inline_keyboard: buttons } };
};

// Previously used ⚠️ for "Check Payment Status" but 🔴 for "Start New
// Consultation" - two different badges for the exact same underlying
// condition (profile incomplete), just because they were hand-coded
// separately. Normalized to 🔴 like every other pending indicator in the app.
const buildConsultationMenu = (profileComplete = false) =>
  renderKeyboard(menuTree.patientConsultationMenu, { isProfileComplete: profileComplete });

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

const buildProfileView = (highlightMissing = {}) =>
  renderKeyboard(menuTree.patientProfileMenu, {
    isProfileComplete: Object.keys(highlightMissing).length === 0,
    hasMissingProfileFields: Object.keys(highlightMissing).length > 0
  });

const buildProfileEdit = () => ({ reply_markup: { inline_keyboard: [[{ text: '1️⃣ Edit Name', callback_data: 'edit_name' }, { text: '2️⃣ Edit Phone', callback_data: 'edit_phone' }]] } });

const buildRoleApplication = () => ({ reply_markup: { inline_keyboard: [
  [{ text: '1️⃣ Doctor', callback_data: 'apply_doctor' }],
  [{ text: '2️⃣ Caregiver', callback_data: 'apply_caregiver' }],
  [{ text: '3️⃣ Support', callback_data: 'apply_support' }],
  [{ text: '4️⃣ Cancel', callback_data: 'cancel' }]
] } });

// Previously emitted a `role_${r}` button per applied role with no handler
// anywhere in the app and no way back - a guaranteed dead end. /roles is an
// informational screen (role/status list is in the message text), so all it
// needs is a way back to the menu.
const buildMyRoles = (roles = [], profile = {}) => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Back to Menu', callback_data: 'main_menu' }]] } });

const buildProfileRemoveRole = () => ({ reply_markup: { inline_keyboard: [[{ text: 'doctor', callback_data: 'remove_doctor' }, { text: 'caregiver', callback_data: 'remove_caregiver' }, { text: 'support', callback_data: 'remove_support' }, { text: '0️⃣ Cancel', callback_data: 'cancel' }]] } });

const buildDiscountPrimary = () => ({ reply_markup: { inline_keyboard: [
  [{ text: '1️⃣ Economic & Schemes', callback_data: 'discount_economic' }],
  [{ text: '2️⃣ Profession & Service', callback_data: 'discount_profession' }],
  [{ text: '3️⃣ Social & Demographic', callback_data: 'discount_social' }],
  [{ text: '4️⃣ No Discount (Full Fee)', callback_data: 'discount_none' }],
  [{ text: '0️⃣ Back', callback_data: 'discount_back' }]
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

const buildConsentsMenu = () => ({ reply_markup: { inline_keyboard: [
  [{ text: '✅ Teleconsultation', callback_data: 'consent_tele' }, { text: '✅ Data Sharing', callback_data: 'consent_data' }, { text: '✅ DPDP', callback_data: 'consent_dpdp' }],
  [{ text: '0️⃣ Cancel', callback_data: 'cancel' }]
] } });

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

const buildAdminProfileEdit = (missingFields = []) =>
  renderKeyboard(menuTree.adminProfileEdit, adminMenuFacts(0, 0, missingFields.length === 0, false, false, 0, 0, false, missingFields));

const buildAdminProfileEditName = () => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Cancel', callback_data: 'cancel' }]] } });

const buildAdminProfileEditPhone = () => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Cancel', callback_data: 'cancel' }]] } });

const buildDoctorProfileEdit = () => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Cancel', callback_data: 'cancel' }]] } });

const buildDoctorMsgAdminInput = () => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Back to Doctor Menu', callback_data: 'doctor_menu' }]] } });

const buildAdminAssignDoctorInput = () => ({ reply_markup: { inline_keyboard: [[{ text: '0️⃣ Back to Doctor Management', callback_data: 'doctor_management' }]] } });

// Inline pickers for Assign/Reassign Doctor (see startAssignDoctorFlow /
// startReassignDoctorFlow in conversationFlow.js). Buttons use plain digit
// callback_data ('1','2',...,'0') matching the 1-based list index the
// handlers parse - since these lists are dynamically sized per request,
// there's no fixed callback_data string a payloadMap entry could name, so
// the digit itself IS the payload (same trick the fixed-size menus rely on,
// just generated instead of hardcoded).
const buildAdminAssignDoctorSelect = (pending = []) => ({
  reply_markup: { inline_keyboard: [
    ...pending.map((c, i) => [{ text: `${i + 1}️⃣ ${c.patientProfile?.name || c.patientPhone}`, callback_data: String(i + 1) }]),
    [{ text: '0️⃣ Back to Doctor Management', callback_data: '0' }]
  ] }
});

const buildAdminAssignDoctorPick = (doctors = []) => ({
  reply_markup: { inline_keyboard: [
    ...doctors.map((d, i) => [{ text: `${i + 1}️⃣ Dr. ${formatDoctorName(d.name)} (${d.specialty})`, callback_data: String(i + 1) }]),
    [{ text: '0️⃣ Back to Doctor Management', callback_data: '0' }]
  ] }
});

const buildAdminReassignDoctorSelect = (assigned = []) => ({
  reply_markup: { inline_keyboard: [
    ...assigned.map((c, i) => [{ text: `${i + 1}️⃣ ${c.patientProfile?.name || c.patientPhone}`, callback_data: String(i + 1) }]),
    [{ text: '0️⃣ Back to Doctor Management', callback_data: '0' }]
  ] }
});

const buildAdminReassignDoctorPick = (doctors = []) => ({
  reply_markup: { inline_keyboard: [
    ...doctors.map((d, i) => [{ text: `${i + 1}️⃣ Dr. ${formatDoctorName(d.name)} (${d.specialty})`, callback_data: String(i + 1) }]),
    [{ text: '0️⃣ Back to Doctor Management', callback_data: '0' }]
  ] }
});

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

const buildAdminRoleApprovals = (pendingCounts = { doctor: 0, caregiver: 0, support: 0 }) =>
  renderKeyboard(menuTree.adminRoleApprovals, {
    ...adminMenuFacts(0, 0, true, false, false, 0, 0, false),
    pendingDoctorRoleRequests: pendingCounts?.doctor || 0,
    pendingCaregiverRoleRequests: pendingCounts?.caregiver || 0,
    pendingSupportRoleRequests: pendingCounts?.support || 0
  });

const buildBillingMenu = () => ({
  reply_markup: { inline_keyboard: [
    [{ text: '1️⃣ Request Payment Link', callback_data: 'request_payment_link' }],
    [{ text: '2️⃣ Check Payment Status', callback_data: 'payment_status' }],
    [{ text: '3️⃣ Apply for Fee Discount', callback_data: 'apply_discount' }],
    [{ text: '0️⃣ Main Menu', callback_data: 'main_menu' }]
  ]}
});

const buildAdminDoctorManagement = (pendingDocs = 0) =>
  renderKeyboard(menuTree.adminDoctorManagement, adminMenuFacts(0, 0, true, false, false, 0, pendingDocs, false));

const buildDoctorMenu = (name = 'Doctor', hasActive = false, pendingActions = 0) =>
  renderKeyboard(menuTree.doctorRoot, { hasActiveConsultation: hasActive, pendingActions });

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
  buildAdminAssignDoctorSelect,
  buildAdminAssignDoctorPick,
  buildAdminRemoveDoctorInput,
  buildAdminRejectDoctorInput,
  buildAdminMessageDoctorInput,
  buildAdminReassignDoctorInput,
  buildAdminReassignDoctorSelect,
  buildAdminReassignDoctorPick,
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