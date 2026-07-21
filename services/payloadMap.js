const { FlowStates } = require('./conversationFlow');

const payloadMap = {
  [FlowStates.WELCOME]: { 'consultation': '1', 'profile': '2', 'switch_role': '3' },
  [FlowStates.CAREGIVER_MENU]: { 'consultation': '1', 'profile': '2', 'switch_role': '0' },
  [FlowStates.DOCTOR_MENU]: { 'doctor_status': '1', 'my_patients': '2', 'edit_profile': '3', 'message_admin': '4', 'switch_role': '0' },
  [FlowStates.SUPPORT_MENU]: { 'active_consultations': '1', 'message_doctor': '2', 'message_patient': '3', 'profile': '4', 'switch_role': '0' },
  [FlowStates.ADMIN_MENU]: { 
    'menu_consultations': 'menu_consultations',
    'menu_finances': 'menu_finances',
    'menu_system': 'menu_system',
    'profile': 'profile',
    'switch_role': '0' 
  },
  [FlowStates.SUPER_ADMIN_MENU]: { 
    'menu_consultations': 'menu_consultations',
    'menu_finances': 'menu_finances',
    'menu_system': 'menu_system',
    'profile': 'profile',
    'switch_role': '0' 
  },
  [FlowStates.ADMIN_CONSULTATIONS_MENU]: { 
    'pending_requests': '1', 
    'active_consultations': '2', 
    'view_patients': '3', 
    'message_patient': '4', 
    'close_consultation': '5', 
    'admin_menu': '0' 
  },
  [FlowStates.ADMIN_FINANCES_MENU]: { 
    'verify_payment': '1', 
    'verify_discount': '2', 
    'set_fee': '3', 
    'admin_menu': '0' 
  },
  [FlowStates.ADMIN_SYSTEM_MENU]: { 
    'role_approvals': '1', 
    'doctor_management': '2', 
    'manage_admins': '3', 
    'admin_menu': '0' 
  },
  [FlowStates.SUPER_ADMIN_MANAGE_ADMINS]: { 'add_admin': '1', 'remove_admin': '2', 'back_to_menu': '0' },
  [FlowStates.PROFILE_VIEW]: { 'view_profile': '1', 'edit_profile': '2', 'apply_role': '3', 'my_roles': '4', 'remove_role': '5', 'main_menu': '0' },
  [FlowStates.CONSULTATION]: { 'start_consultation': '1', 'payment_status': '2', 'withdraw': '3', 'main_menu': '4' },
  [FlowStates.CONSULTATION_WITHDRAW]: { 'withdraw_confirm': '1', 'withdraw_cancel': '0' },
  [FlowStates.ADMIN_ROLE_APPROVALS]: { 'view_role_apps': '1', 'approve_doctor': '2', 'approve_caregiver': '3', 'approve_support': '4', 'admin_menu': '0' },
  [FlowStates.ADMIN_DOCTOR_MANAGEMENT]: { 'view_doctors': '1', 'invite_doctor': '2', 'register_doctor': '3', 'assign_doctor': '4', 'remove_doctor': '5', 'reject_doctor': '6', 'message_doctor': '7', 'reassign_doctor': '8', 'admin_menu': '0' },
  [FlowStates.CANCER_TYPE]: { 'cancer_lung': '1', 'cancer_breast': '2', 'cancer_prostate': '3', 'cancer_liver': '4', 'cancer_pancreatic': '5', 'cancer_ovarian': '6', 'cancer_blood': '7', 'cancer_general': '8', 'cancel': '0' },
  [FlowStates.ADMIN_CLOSE_CONSULTATION]: { 'close_confirm': '1', 'close_cancel': '0' },
  [FlowStates.ADMIN_PROFILE_EDIT]: { 'edit_name': '1', 'edit_phone': '2', 'cancel': '0' },
  [FlowStates.PROFILE_CONSENTS]: { 'consent_tele': '1', 'consent_data': '2', 'consent_dpdp': '3' },
  [FlowStates.PROFILE_DISCOUNT_CATEGORY]: { 'discount_economic': '1', 'discount_profession': '2', 'discount_social': '3', 'discount_none': '4' }
};

module.exports = { payloadMap };
