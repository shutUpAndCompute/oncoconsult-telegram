const { FlowStates } = require('./conversationFlow');

const MAX_FILE_SIZE_MB = 20;

const buildMainMenu = (persona = 'patient', hasOtherRoles = false, profileComplete = true, isAdmin = false, isSuperAdmin = false, pendingCount = 0, activeCount = 0) => {
  const buttons = [];
  
  if (!profileComplete) {
    buttons.push(['🔴 1️⃣ My Consultations']);
  } else {
    buttons.push(['1️⃣ My Consultations']);
  }
  
  buttons.push(['2️⃣ Profile & Roles']);
  
  if (hasOtherRoles) {
    buttons.push(['3️⃣ Switch Role']);
  }
  
  return { reply_markup: { inline_keyboard: buttons } };
};

const buildPersonaSelect = (currentPersona, approvedRoles = []) => {
  const buttons = [];
  const roleLabels = {
    patient: '1️⃣ Patient Mode',
    caregiver: '2️⃣ Caregiver Mode',
    doctor: '3️⃣ Doctor Mode',
    admin: '4️⃣ Admin Mode',
    super_admin: '4️⃣ Admin Mode',
    support: '5️⃣ Support Mode'
  };
  
  approvedRoles.forEach(role => {
    if (roleLabels[role]) {
      buttons.push([roleLabels[role]]);
    }
  });
  
  buttons.push(['0️⃣ Main Menu']);
  
  return {
    reply_markup: { inline_keyboard: buttons },
    text: `👤 *Select Your Role*\n\nCurrent: ${currentPersona || 'Patient'}`
  };
};

const buildProfileMenu = (highlightMissing = {}) => {
  const buttons = [];
  
  buttons.push(['1️⃣ View Profile']);
  
  if (highlightMissing.name) {
    buttons.push(['🔴 2️⃣ Edit Profile']);
  } else {
    buttons.push(['2️⃣ Edit Profile']);
  }
  
  buttons.push(['3️⃣ Apply for Role']);
  buttons.push(['4️⃣ My Roles']);
  buttons.push(['5️⃣ Remove Role']);
  buttons.push(['0️⃣ Back to Profile']);
  
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
  
  buttons.push([pending > 0 && showIndicator(1) ? '🔴 1️⃣ Pending Requests' : '1️⃣ Pending Requests']);
  buttons.push([active > 0 ? '🟢 2️⃣ Active Consultations' : '2️⃣ Active Consultations']);
  buttons.push(['3️⃣ Role Approvals']);
  buttons.push(['4️⃣ Doctor Management']);
  buttons.push([!isProfileComplete && showIndicator(5) ? '🔴 5️⃣ Profile' : '5️⃣ Profile']);
  buttons.push(['6️⃣ View Patient Profiles']);
  buttons.push([hasPendingPayments && showIndicator(7) ? '🔴 7️⃣ Verify Payment' : '7️⃣ Verify Payment']);
  buttons.push([hasPendingDiscounts && showIndicator(8) ? '🔴 8️⃣ Verify Discount' : '8️⃣ Verify Discount']);
  buttons.push(['9️⃣ Message Patient']);
  buttons.push(['🔟 Close Consultation']);
  buttons.push(['13️⃣ Set Fee']);
  buttons.push(['0️⃣ Switch Role']);
  
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
  
  buttons.push([pending > 0 && showIndicator(1) ? `🔴 1️⃣ Pending Requests (${pending} pending)` : `1️⃣ Pending Requests (${pending} pending)`]);
  buttons.push([active > 0 ? `🟢 2️⃣ Active Consultations (${active} active)` : `2️⃣ Active Consultations (${active} active)`]);
  buttons.push(['3️⃣ Role Approvals']);
  buttons.push(['4️⃣ Doctor Management']);
  buttons.push([!isProfileComplete && showIndicator(5) ? '🔴 5️⃣ Profile' : '5️⃣ Profile']);
  buttons.push(['6️⃣ View All Patients']);
  buttons.push([hasPendingPayments && showIndicator(7) ? '🔴 7️⃣ Verify Payment' : '7️⃣ Verify Payment']);
  buttons.push([hasPendingDiscounts && showIndicator(8) ? '🔴 8️⃣ Verify Discount' : '8️⃣ Verify Discount']);
  buttons.push(['9️⃣ Message Patient']);
  buttons.push(['🔟 Close Consultation']);
  buttons.push(['1️⃣1 Add Admin']);
  buttons.push(['1️⃣2 Remove Admin']);
  buttons.push(['0️⃣ Switch Role']);
  
  return { reply_markup: { inline_keyboard: buttons } };
};

const buildCancerTypeMenu = () => {
  const buttons = [
    ['1️⃣ Lung Cancer', '2️⃣ Breast Cancer', '3️⃣ Prostate Cancer'],
    ['4️⃣ Liver Cancer', '5️⃣ Pancreatic', '6️⃣ Ovarian'],
    ['7️⃣ Blood Cancer', '8️⃣ Other/General'],
    ['0️⃣ Cancel']
  ];
  return { reply_markup: { inline_keyboard: buttons } };
};

const buildConsultationMenu = (profileComplete = false) => {
  const buttons = [];
  
  if (!profileComplete) {
    buttons.push(['🔴 1️⃣ Start New Consultation']);
    buttons.push(['⚠️ 2️⃣ Check Payment Status']);
  } else {
    buttons.push(['1️⃣ Start New Consultation']);
    buttons.push(['2️⃣ Check Payment Status']);
  }
  
  buttons.push(['3️⃣ Withdraw Consultation']);
  buttons.push(['4️⃣ Back to Menu']);
  
  return { reply_markup: { inline_keyboard: buttons } };
};

const buildDoctorMenu = (doctorName, hasActive, pendingActions = 0) => {
  const buttons = [];
  
  buttons.push([pendingActions > 0 ? `🔴 1️⃣ Status` : '1️⃣ Status']);
  buttons.push(['2️⃣ My Patients']);
  buttons.push(['3️⃣ Edit Profile']);
  buttons.push(['4️⃣ Message Admin']);
  
  if (hasActive) {
    buttons.push(['_Has active consultation_']);
  }
  
  if (pendingActions > 0) {
    buttons.push([`_${pendingActions} pending action${pendingActions > 1 ? 's' : ''}_`]);
  }
  
  buttons.push(['0️⃣ Switch Role']);
  
  return { reply_markup: { inline_keyboard: buttons } };
};

const buildAdminRoleApprovals = (pendingApps = 0) => {
  const buttons = [];
  
  buttons.push([pendingApps > 0 ? '🔴 1️⃣ View Role Applications' : '1️⃣ View Role Applications']);
  buttons.push(['2️⃣ Approve Doctor']);
  buttons.push(['3️⃣ Approve Caregiver']);
  buttons.push(['4️⃣ Approve Support']);
  buttons.push(['0️⃣ Back to Admin Menu']);
  
  return { reply_markup: { inline_keyboard: buttons } };
};

const buildAdminDoctorManagement = (pendingDoctors = 0) => {
  const buttons = [];
  
  buttons.push([pendingDoctors > 0 ? '🔴 1️⃣ List Doctors' : '1️⃣ List Doctors']);
  buttons.push([pendingDoctors > 0 ? '🔴 2️⃣ List Pending Doctors' : '2️⃣ List Pending Doctors']);
  buttons.push(['3️⃣ Assign Doctor']);
  buttons.push(['4️⃣ Reassign Doctor']);
  buttons.push(['5️⃣ Remove Doctor']);
  buttons.push(['6️⃣ Reject Doctor']);
  buttons.push(['7️⃣ Message Doctor']);
  buttons.push(['8️⃣ Register Doctor']);
  buttons.push(['9️⃣ Invite Doctor']);
  buttons.push(['0️⃣ Back to Admin Menu']);
  
  return { reply_markup: { inline_keyboard: buttons } };
};

const buildBillingMenu = () => {
  const buttons = [
    ['1️⃣ Request Payment Link'],
    ['2️⃣ Back to Menu'],
    ['3️⃣ Apply for Fee Discount']
  ];
  return { reply_markup: { inline_keyboard: buttons } };
};

const buildProfileCompleteOptions = (role) => {
  const buttons = [
    ['1️⃣ Go to Admin Menu'],
    ['2️⃣ Continue Editing'],
    ['3️⃣ Cancel']
  ];
  return {
    reply_markup: { inline_keyboard: buttons },
    text: `✅ *${role} Profile Complete!*\n\nYour profile is now ready. What would you like to do?`
  };
};

const buildRoleSelect = () => ({
  reply_markup: { inline_keyboard: [
    ['1️⃣ Patient (need consultation)'],
    ['2️⃣ Caregiver (helping someone)'],
    ['3️⃣ Doctor (oncologist)'],
    ['0️⃣ Cancel']
  ]}
});

const buildCaregiverAuth = () => ({
  reply_markup: { inline_keyboard: [
    ['1️⃣ I am authorized to act on patient\'s behalf'],
    ['2️⃣ I am the patient myself'],
    ['0️⃣ Cancel']
  ]}
});

const buildPlatformTerms = () => ({
  reply_markup: { inline_keyboard: [
    ['1️⃣ ✅ I Agree & Continue'],
    ['2️⃣ ❌ Disagree - Exit'],
    ['cancel']
  ]}
});

const buildProfileView = () => ({
  reply_markup: { inline_keyboard: [
    ['EDIT', 'MENU'],
    ['0️⃣ Back']
  ]}
});

const buildProfileEdit = () => ({
  reply_markup: { inline_keyboard: [
    ['0️⃣ Cancel']
  ]}
});

const buildRoleApplication = () => ({
  reply_markup: { inline_keyboard: [
    ['1️⃣ Doctor'],
    ['2️⃣ Caregiver'],
    ['3️⃣ Support'],
    ['4️⃣ Cancel']
  ]}
});

const buildMyRoles = (roles, roleStatus) => ({
  reply_markup: { inline_keyboard: [
    ['0️⃣ Back to Menu']
  ]}
});

const buildProfileRemoveRole = () => ({
  reply_markup: { inline_keyboard: [
    ['doctor', 'caregiver', 'support'],
    ['0️⃣ Back to Menu']
  ]}
});

const buildDiscountCategories = () => ({
  reply_markup: { inline_keyboard: [
    ['1️⃣ BPL / EWS', '2️⃣ Ayushman Bharat'],
    ['3️⃣ e-Shram', '4️⃣ Farmer'],
    ['5️⃣ Defence', '6️⃣ Paramilitary'],
    ['7️⃣ Police', '8️⃣ Government Employee'],
    ['9️⃣ Senior Citizen', '1️⃣1️⃣ Widow'],
    ['1️⃣2️⃣ PwD', '1️⃣3️⃣ SC/ST'],
    ['1️⃣4️⃣ Minority', '1️⃣5️⃣ Rural/Tribal'],
    ['1️⃣6️⃣ Healthcare Worker', '1️⃣7️⃣ Teacher'],
    ['1️⃣8️⃣ Journalist', '1️⃣9️⃣ No Discount'],
    ['0️⃣ Cancel']
  ]}
});

const buildConsentsMenu = () => ({
  reply_markup: { inline_keyboard: [
    ['1️⃣ ✅ Teleconsultation'],
    ['2️⃣ ✅ Data Sharing'],
    ['3️⃣ ✅ DPDP Act'],
    ['CANCEL']
  ]}
});

const buildDoctorSelect = (doctors) => {
  const buttons = [];
  if (!doctors || doctors.length === 0) {
    buttons.push(['_No doctors available_']);
  } else {
    doctors.forEach((d, i) => {
      buttons.push([`${i + 1}. Dr. ${d.name} - ${d.specialty}`]);
    });
  }
  buttons.push(['0️⃣ Back to Menu']);
  return { reply_markup: { inline_keyboard: buttons } };
};

const buildConsultationCompleted = () => ({
  reply_markup: { inline_keyboard: [
    ['1️⃣ My Consultations'],
    ['2️⃣ View Profile'],
    ['3️⃣ Main Menu']
  ]}
});

const buildCloseConsultationPrompt = () => ({
  reply_markup: { inline_keyboard: [
    ['0️⃣ Back to Admin Menu']
  ]}
});

const buildMobileCollection = () => ({
  reply_markup: { inline_keyboard: [
    ['SKIP']
  ]}
});

const buildCaregiverPatientLink = () => ({
  reply_markup: { inline_keyboard: [
    ['0️⃣ Switch Role']
  ]}
});

const buildAdminProfileEdit = () => ({
  reply_markup: { inline_keyboard: [
    ['1️⃣ Edit Name'],
    ['2️⃣ Edit Phone Number'],
    ['3️⃣ View Profile'],
    ['0️⃣ Back to Profile']
  ]}
});

const buildAdminProfileEditName = () => ({
  reply_markup: { inline_keyboard: [
    ['0️⃣ Cancel']
  ]}
});

const buildAdminProfileEditPhone = () => ({
  reply_markup: { inline_keyboard: [
    ['0️⃣ Cancel']
  ]}
});

const buildDoctorProfileEdit = () => ({
  reply_markup: { inline_keyboard: [
    ['0️⃣ Menu']
  ]}
});

const buildDoctorMsgAdminInput = (pendingActions = 0) => ({
  reply_markup: { inline_keyboard: [
    ['0️⃣ Back to Doctor Menu']
  ]}
});

const buildAdminAssignDoctorInput = () => ({
  reply_markup: { inline_keyboard: [
    ['0️⃣ Back']
  ]}
});

const buildAdminRemoveDoctorInput = () => ({
  reply_markup: { inline_keyboard: [
    ['0️⃣ Back']
  ]}
});

const buildAdminRejectDoctorInput = () => ({
  reply_markup: { inline_keyboard: [
    ['0️⃣ Back']
  ]}
});

const buildAdminMessageDoctorInput = () => ({
  reply_markup: { inline_keyboard: [
    ['0️⃣ Back']
  ]}
});

const buildAdminReassignDoctorInput = () => ({
  reply_markup: { inline_keyboard: [
    ['0️⃣ Back']
  ]}
});

const buildAdminMessagePatientInput = () => ({
  reply_markup: { inline_keyboard: [
    ['0️⃣ Back']
  ]}
});

const buildAdminVerifyPaymentInput = () => ({
  reply_markup: { inline_keyboard: [
    ['0️⃣ Back']
  ]}
});

const buildAdminVerifyDiscountInput = () => ({
  reply_markup: { inline_keyboard: [
    ['0️⃣ Back']
  ]}
});

const buildAdminInviteDoctorInput = () => ({
  reply_markup: { inline_keyboard: [
    ['0️⃣ Back']
  ]}
});

const buildAdminRegisterDoctorInput = () => ({
  reply_markup: { inline_keyboard: [
    ['0️⃣ Back']
  ]}
});

const buildAdminApproveDoctorInput = () => ({
  reply_markup: { inline_keyboard: [
    ['0️⃣ Back']
  ]}
});

const buildAdminApproveCaregiverInput = () => ({
  reply_markup: { inline_keyboard: [
    ['0️⃣ Back']
  ]}
});

const buildAdminApproveSupportInput = () => ({
  reply_markup: { inline_keyboard: [
    ['0️⃣ Back']
  ]}
});

const buildAdminAddAdminInput = () => ({
  reply_markup: { inline_keyboard: [
    ['0️⃣ Back to Admin Menu']
  ]}
});

const buildAdminRemoveAdminInput = () => ({
  reply_markup: { inline_keyboard: [
    ['0️⃣ Back to Admin Menu']
  ]}
});

const buildAdminSetFeeInput = () => ({
  reply_markup: { inline_keyboard: [
    ['0️⃣ Back to Admin Menu']
  ]}
});

const buildPendingRequests = (pending) => ({
  reply_markup: { inline_keyboard: [
    ['0️⃣ Back to Admin Menu']
  ]}
});

const buildActiveConsultations = () => ({
  reply_markup: { inline_keyboard: [
    ['0️⃣ Back to Admin Menu']
  ]}
});

const buildViewAllPatients = (patients) => ({
  reply_markup: { inline_keyboard: [
    ['0️⃣ Back to Admin Menu']
  ]}
});

const buildViewLinkedPatients = (patients) => ({
  reply_markup: { inline_keyboard: [
    ['0️⃣ Back']
  ]}
});

const buildDoctorStatus = () => ({
  reply_markup: { inline_keyboard: [
    ['0️⃣ Back']
  ]}
});

const buildWithdrawalConfirm = () => ({
  reply_markup: { inline_keyboard: [
    ['1️⃣ Yes, withdraw'],
    ['2️⃣ No, keep consultation']
  ]}
});

const buildReportUpload = () => ({
  reply_markup: { inline_keyboard: [
    ['0️⃣ Back to Menu']
  ]}
});

const buildProfileDiscountDocuments = () => ({
  reply_markup: { inline_keyboard: [
    ['0️⃣ Skip']
  ]}
});

module.exports = {
  buildMainMenu,
  buildPersonaSelect,
  buildProfileMenu,
  buildAdminMenu,
  buildSuperAdminMenu,
  buildCancerTypeMenu,
  buildConsultationMenu,
  buildDoctorMenu,
  buildAdminRoleApprovals,
  buildAdminDoctorManagement,
  buildBillingMenu,
  buildProfileCompleteOptions,
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
  MAX_FILE_SIZE_MB
};