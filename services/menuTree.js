// Declarative menu trees, one per role. This is the single place that
// describes "what menu screens exist, what buttons they have, and which
// live fact each button's red/green dot depends on" - services/menuFacts.js
// computes the facts, services/menuTreeRenderer.js turns a (node, facts)
// pair into a keyboard or text list. No menu-building code anywhere else in
// the app should compute badge state independently of this file.
//
// Node shape:
//   id           - unique string, matches a FlowStates value when the node
//                  is itself a screen (used by buildKeyboardForState to look
//                  up "which node renders this state's keyboard").
//   label        - string, or (facts) => string for counts embedded in text.
//   callbackData - the callback_data this node's button emits when it
//                  appears as a row in its PARENT's keyboard. Must match
//                  payloadMap.js/conversationFlow.js exactly - this file
//                  only changes how keyboards render, never what a tap means.
//   digit        - fixed digit override (used for "0" back/cancel buttons);
//                  omitted for auto-numbered (1, 2, 3...) buttons.
//   isPending    - (facts) => boolean; leaf-level red-dot source of truth.
//                  Parent nodes omit this and inherit via cascade instead.
//   hasActivity  - (facts) => boolean; leaf-level green-dot source of truth.
//   visible      - (facts) => boolean; omit to always show (e.g. "Manage
//                  Admins" is super-admin only).
//   children     - child nodes, in display order.

const adminFinancesMenu = {
  id: 'admin_finances_menu',
  callbackData: 'menu_finances',
  label: 'Finances',
  // Pre-existing product decision (not a tree-model default): Discount
  // review outranks Payment review when both are pending, so only one dot
  // shows here even though both facts are independently true.
  priorityOrder: ['verify_discount', 'verify_payment'],
  children: [
    { id: 'verify_payment', callbackData: 'verify_payment', label: 'Verify Payment', isPending: f => f.hasPendingPayments },
    { id: 'verify_discount', callbackData: 'verify_discount', label: 'Verify Discount', isPending: f => f.hasPendingDiscounts },
    { id: 'set_fee', callbackData: 'set_fee', label: 'Set Fee' },
    { id: 'finances_back', callbackData: 'admin_menu', label: 'Back to Admin Menu', digit: 0 }
  ]
};

const adminRoleApprovals = {
  id: 'admin_role_approvals',
  callbackData: 'role_approvals',
  label: 'Role Approvals',
  children: [
    { id: 'view_role_apps', callbackData: 'view_role_apps', label: 'View Role Applications' },
    {
      id: 'approve_doctor', callbackData: 'approve_doctor',
      label: f => f.pendingDoctorRoleRequests > 0 ? `Approve Doctor (${f.pendingDoctorRoleRequests} pending)` : 'Approve Doctor',
      isPending: f => f.pendingDoctorRoleRequests > 0
    },
    {
      id: 'approve_caregiver', callbackData: 'approve_caregiver',
      label: f => f.pendingCaregiverRoleRequests > 0 ? `Approve Caregiver (${f.pendingCaregiverRoleRequests} pending)` : 'Approve Caregiver',
      isPending: f => f.pendingCaregiverRoleRequests > 0
    },
    {
      id: 'approve_support', callbackData: 'approve_support',
      label: f => f.pendingSupportRoleRequests > 0 ? `Approve Support (${f.pendingSupportRoleRequests} pending)` : 'Approve Support',
      isPending: f => f.pendingSupportRoleRequests > 0
    },
    { id: 'role_approvals_back', callbackData: 'menu_system', label: 'Back to System Menu', digit: 0 }
  ]
};

const adminDoctorManagement = {
  id: 'admin_doctor_management',
  callbackData: 'doctor_management',
  label: 'Doctor Management',
  children: [
    { id: 'view_doctors', callbackData: 'view_doctors', label: 'View Doctors' },
    { id: 'invite_doctor', callbackData: 'invite_doctor', label: 'Invite Doctor' },
    {
      id: 'register_doctor', callbackData: 'register_doctor',
      label: f => f.pendingDoctorInvites > 0 ? `Register Doctor (${f.pendingDoctorInvites} pending)` : 'Register Doctor',
      isPending: f => f.pendingDoctorInvites > 0
    },
    { id: 'assign_doctor', callbackData: 'assign_doctor', label: 'Assign Doctor' },
    { id: 'remove_doctor', callbackData: 'remove_doctor', label: 'Remove Doctor' },
    { id: 'reject_doctor', callbackData: 'reject_doctor', label: 'Reject Doctor' },
    { id: 'message_doctor', callbackData: 'message_doctor', label: 'Message Doctor' },
    { id: 'reassign_doctor', callbackData: 'reassign_doctor', label: 'Reassign Doctor' },
    { id: 'doctor_mgmt_back', callbackData: 'menu_system', label: 'Back to System Menu', digit: 0 }
  ]
};

const superAdminManageAdmins = {
  id: 'super_admin_manage_admins',
  callbackData: 'manage_admins',
  label: 'Manage Admins',
  visible: f => f.isSuperAdmin,
  children: [
    { id: 'add_admin', callbackData: 'add_admin', label: 'Add Admin' },
    { id: 'remove_admin', callbackData: 'remove_admin', label: 'Remove Admin' },
    { id: 'manage_admins_back', callbackData: 'menu_system', label: 'Back to System Menu', digit: 0 }
  ]
};

const adminSystemMenu = {
  id: 'admin_system_menu',
  callbackData: 'menu_system',
  label: 'System & Roles',
  children: [adminRoleApprovals, adminDoctorManagement, superAdminManageAdmins,
    { id: 'system_back', callbackData: 'admin_menu', label: 'Back to Admin Menu', digit: 0 }]
};

const adminConsultationsMenu = {
  id: 'admin_consultations_menu',
  callbackData: 'menu_consultations',
  label: 'Consultations',
  children: [
    {
      id: 'pending_requests', callbackData: 'pending_requests',
      label: f => `Pending Requests (${f.pendingConsultations} pending)`,
      isPending: f => f.pendingConsultations > 0
    },
    {
      id: 'active_consultations', callbackData: 'active_consultations',
      label: f => `Active Consultations (${f.activeConsultations} active)`,
      hasActivity: f => f.activeConsultations > 0
    },
    { id: 'view_patients', callbackData: 'view_patients', label: 'View Patient Profiles' },
    { id: 'message_patient', callbackData: 'message_patient', label: 'Message Patient' },
    { id: 'close_consultation', callbackData: 'close_consultation', label: 'Close Consultation' },
    { id: 'consultations_back', callbackData: 'admin_menu', label: 'Back to Admin Menu', digit: 0 }
  ]
};

const adminProfileEdit = {
  id: 'admin_profile_edit',
  callbackData: 'profile',
  label: 'My Profile',
  isPending: f => !f.isAdminProfileComplete,
  children: [
    {
      id: 'edit_name', callbackData: 'edit_name', label: 'Edit Name',
      isPending: f => f.adminMissingFields.some(x => x.toLowerCase() === 'name')
    },
    {
      id: 'edit_phone', callbackData: 'edit_phone', label: 'Edit Phone',
      isPending: f => f.adminMissingFields.some(x => x.toLowerCase() === 'phone' || x.toLowerCase() === 'phonenumber')
    },
    { id: 'view_admin_profile', callbackData: 'view_profile', label: 'View Profile' },
    { id: 'profile_edit_back', callbackData: 'cancel', label: 'Back to Profile', digit: 0 }
  ]
};

// Root for both ADMIN_MENU and SUPER_ADMIN_MENU - the "Manage Admins" child
// of System already self-hides for non-super-admins via `visible`, so one
// tree correctly serves both roles.
const adminRoot = {
  id: 'admin_root',
  // Pre-existing product decision, per DESIGN_CASCADING_INDICATORS.md's
  // documented priority order: Finances > System & Roles > My Profile >
  // Consultations. Drilling into any of these still shows that submenu's
  // own true state regardless of which sibling "won" at this level.
  priorityOrder: ['admin_finances_menu', 'admin_system_menu', 'admin_profile_edit', 'admin_consultations_menu'],
  children: [
    adminConsultationsMenu,
    adminFinancesMenu,
    adminSystemMenu,
    adminProfileEdit,
    { id: 'admin_switch_role', callbackData: 'switch_role', label: 'Switch Role', digit: 0 }
  ]
};

// Flat registry: FlowStates value -> the node whose CHILDREN are that
// state's own screen. buildKeyboardForState looks a state up here once.
const ADMIN_STATE_NODES = {
  admin_menu: adminRoot,
  super_admin_menu: adminRoot,
  admin_consultations_menu: adminConsultationsMenu,
  admin_finances_menu: adminFinancesMenu,
  admin_system_menu: adminSystemMenu,
  admin_role_approvals: adminRoleApprovals,
  admin_doctor_management: adminDoctorManagement,
  super_admin_manage_admins: superAdminManageAdmins,
  admin_profile_edit: adminProfileEdit
};

// --- Patient / Caregiver ---

const patientConsultationMenu = {
  id: 'consultation',
  callbackData: 'consultation',
  label: 'My Consultations',
  children: [
    { id: 'start_consultation', callbackData: 'start_consultation', label: 'Start New Consultation', isPending: f => !f.isProfileComplete },
    { id: 'payment_status', callbackData: 'payment_status', label: 'Check Payment Status', isPending: f => !f.isProfileComplete },
    { id: 'withdraw', callbackData: 'withdraw', label: 'Withdraw Consultation' },
    { id: 'consultation_back', callbackData: 'main_menu', label: 'Back to Menu', digit: 4 }
  ]
};

const patientProfileMenu = {
  id: 'profile_view',
  callbackData: 'profile',
  label: 'Profile & Roles',
  isPending: f => !f.isProfileComplete,
  children: [
    { id: 'view_profile', callbackData: 'view_profile', label: 'View Profile' },
    { id: 'edit_profile', callbackData: 'edit_profile', label: 'Edit Profile', isPending: f => f.hasMissingProfileFields },
    { id: 'apply_role', callbackData: 'apply_role', label: 'Apply for Role', isPending: f => f.hasMissingProfileFields },
    { id: 'my_roles', callbackData: 'my_roles', label: 'My Roles' },
    { id: 'remove_role', callbackData: 'remove_role', label: 'Remove Role' },
    { id: 'profile_back', callbackData: 'main_menu', label: 'Back to Menu', digit: 0 }
  ]
};

// "My Consultations" is deliberately informational-only (🟢 activity, never
// 🔴) even though its own submenu (patientConsultationMenu) has actionable
// children - unlike the admin tree, this root button intentionally does NOT
// cascade its children's red state up, matching the pre-existing product
// behavior (Start Consultation/Payment Status being blocked on an
// incomplete profile is signalled via "Profile & Roles" going red, not by
// making "My Consultations" red too). "Profile & Roles" reuses
// patientProfileMenu directly (not a redundant re-description) since that
// one genuinely should reflect the same completeness fact at both levels.
const myConsultationsButton = {
  id: 'my_consultations', callbackData: 'consultation', label: 'My Consultations',
  hasActivity: f => f.hasPendingConsultation || f.hasActiveConsultation
};

const patientRoot = {
  id: 'welcome',
  children: [
    myConsultationsButton,
    patientProfileMenu,
    { id: 'patient_switch_role', callbackData: 'switch_role', label: 'Switch Role', digit: 3, visible: f => f.hasOtherRoles }
  ]
};

const caregiverRoot = {
  id: 'caregiver_menu',
  children: [
    myConsultationsButton,
    patientProfileMenu,
    { id: 'caregiver_switch_role', callbackData: 'switch_role', label: 'Switch Role', digit: 0, visible: f => f.hasOtherRoles }
  ]
};

// PROFILE_VIEW deliberately excluded here even though patientProfileMenu is
// its node - it's a SHARED state (admin/doctor/support can land on it too,
// e.g. via Apply for Role), with a different missing-fields source per
// role. The caller must compute role-appropriate facts and render
// patientProfileMenu directly rather than going through this table.
const PATIENT_STATE_NODES = {
  welcome: patientRoot,
  caregiver_menu: caregiverRoot,
  consultation: patientConsultationMenu
};

// --- Doctor ---

const doctorRoot = {
  id: 'doctor_menu',
  children: [
    { id: 'doctor_status', callbackData: 'doctor_status', label: 'Status', hasActivity: f => f.hasActiveConsultation },
    { id: 'my_patients', callbackData: 'my_patients', label: 'My Patients' },
    { id: 'doctor_edit_profile', callbackData: 'edit_profile', label: 'Edit Profile' },
    {
      id: 'message_admin', callbackData: 'message_admin',
      label: f => f.pendingActions > 0 ? `Message Admin (${f.pendingActions} unread)` : 'Message Admin',
      isPending: f => f.pendingActions > 0
    }
  ]
};

const DOCTOR_STATE_NODES = { doctor_menu: doctorRoot };

module.exports = {
  adminRoot, adminConsultationsMenu, adminFinancesMenu, adminSystemMenu,
  adminRoleApprovals, adminDoctorManagement, superAdminManageAdmins, adminProfileEdit,
  patientRoot, caregiverRoot, patientConsultationMenu, patientProfileMenu,
  doctorRoot,
  ADMIN_STATE_NODES, PATIENT_STATE_NODES, DOCTOR_STATE_NODES
};
