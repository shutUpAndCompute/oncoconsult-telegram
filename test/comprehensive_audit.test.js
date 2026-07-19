const { test } = require('node:test');
const assert = require('node:assert');
const { ConversationFlow, FlowStates, InteractiveMenus } = require('../services/conversationFlow');
const adminRegistry = require('../services/adminRegistry');
const ConsultationManager = require('../services/consultationManager');
const DoctorRouter = require('../services/doctorRouter');
const PaymentService = require('../services/paymentService');
const UserRegistry = require('../services/userRegistry');

const fs = require('fs');

const cm = new ConsultationManager(new DoctorRouter());
const ps = new PaymentService();
const ur = new UserRegistry();
const flow = new ConversationFlow(cm, new DoctorRouter(), ps, ur, adminRegistry);

test.after(() => {
  fs.rmSync('./data', { recursive: true, force: true });
});

test.describe('Caregiver Role Audit', () => {
  test('Caregiver session with linked patient', () => {
    cm.updateSession('cg_phone', { isCaregiver: true, linkedPatientPhone: 'patient_phone', selectedPersona: 'caregiver' });
    const session = cm.getSession('cg_phone');
    assert.strictEqual(session.isCaregiver, true, 'isCaregiver flag should be true');
    assert.strictEqual(session.linkedPatientPhone, 'patient_phone', 'linked patient should be set');
  });

  test('Caregiver menu navigation from linked session', () => {
    cm.updateSession('cg_test', { isCaregiver: true, linkedPatientPhone: 'pt_123', selectedPersona: 'caregiver', flowState: 'caregiver_menu' });
    const result = flow.handleCaregiverMenuSelection('0', 'cg_test', { selectedPersona: 'caregiver', linkedPatientPhone: 'pt_123', flowState: 'caregiver_menu' });
    assert.strictEqual(result.nextState, 'persona_select', 'Option 0 should go to persona_select');
  });
});

test.describe('Doctor Role Audit', () => {
  test('Doctor menu option 0 goes to persona select', () => {
    const result = flow.handleDoctorMenuSelection('0', 'doctor_phone', { selectedPersona: 'doctor', flowState: 'doctor_menu' });
    assert.strictEqual(result.nextState, 'persona_select', 'Option 0 should go to persona_select');
  });

  test('Doctor menu option 4 goes to message admin input', () => {
    const result = flow.handleDoctorMenuSelection('4', 'doctor_phone', { selectedPersona: 'doctor', flowState: 'doctor_menu' });
    assert.strictEqual(result.nextState, 'doctor_msg_admin_input', 'Option 4 should go to doctor_msg_admin_input');
  });

  test('Doctor view profile', () => {
    const result = flow.handleViewProfile('doctor_phone', { doctorProfile: { name: 'Dr. Test' }, selectedPersona: 'doctor' });
    assert.strictEqual(result.nextState, 'profile_view', 'Should go to profile_view');
  });
});

test.describe('Support Role Audit', () => {
  test('Support menu option 0 goes to persona select', () => {
    const result = flow.handleSupportMenuSelection('0', 'support_phone', { selectedPersona: 'support', flowState: 'support_menu' });
    assert.strictEqual(result.nextState, 'persona_select', 'Option 0 should go to persona_select');
  });

  test('Support menu option 2 for message doctor', () => {
    const result = flow.handleSupportMenuSelection('2', 'support_phone', { selectedPersona: 'support', flowState: 'support_menu' });
    assert.strictEqual(result.nextState, 'admin_message_doctor_input', 'Option 2 should go to message doctor');
  });
});

test.describe('Consultation Lifecycle Audit', () => {
  test('Consultation request flow', async () => {
    const session = {
      patientProfile: { 
        name: 'Test Patient', 
        age: 30, 
        gender: 'M', 
        cancerType: 'breast',
        confirmedConsents: {
          teleconsultation: true,
          dataSharing: true,
          dpdp: true
        }
      },
      media: [{ id: 'media1', type: 'photo' }],
      isCaregiver: false,
      selectedPersona: 'patient'
    };
    const result = await flow.handleStartConsultation('patient_phone', session);
    assert.strictEqual(result.nextState, 'billing', 'Should go to billing after consultation request');
  });

  test('Consultation request blocked without consents', async () => {
    const session = {
      patientProfile: { 
        name: 'Test Patient', 
        age: 30, 
        gender: 'M', 
        cancerType: 'breast'
        // Missing consents
      },
      media: [{ id: 'media1', type: 'photo' }],
      isCaregiver: false,
      selectedPersona: 'patient'
    };
    const result = await flow.handleStartConsultation('patient_phone', session);
    assert.strictEqual(result.nextState, 'welcome', 'Should go to welcome when consents missing');
  });

  test('Consultation request blocked without reports', async () => {
    const session = {
      patientProfile: { 
        name: 'Test Patient', 
        age: 30, 
        gender: 'M', 
        cancerType: 'breast',
        confirmedConsents: {
          teleconsultation: true,
          dataSharing: true,
          dpdp: true
        }
      },
      media: [], // No reports
      isCaregiver: false,
      selectedPersona: 'patient'
    };
    const result = await flow.handleStartConsultation('patient_phone', session);
    assert.strictEqual(result.nextState, 'report_upload', 'Should go to report_upload when no reports');
  });

  test('Withdrawal confirmation flow', () => {
    const session = {
      consultationId: 'cons_123',
      paymentTransaction: 'txn_456',
      selectedPersona: 'patient',
      flowState: 'consultation_withdraw'
    };
    const result = flow.handleWithdrawalRequest('patient_phone', session);
    assert.strictEqual(result.nextState, 'consultation_withdraw', 'Should stay in withdrawal state');
  });

  test('Consultation completion', () => {
    const result = flow.handleConsultationCompleted('0', 'patient_phone', { selectedPersona: 'patient', flowState: 'completed' });
    assert.strictEqual(result.nextState, 'persona_select', 'Option 0 should go to persona_select');
  });
});

test.describe('Profile Management Audit', () => {
  test('Profile edit flow', () => {
    const result = flow.handleProfileEditInput('9999999999', 'NAME:John Doe\nAGE:30', { patientProfile: {}, flowState: 'profile_edit' });
    assert.strictEqual(result.nextState, 'profile_view', 'Should update profile and show view');
  });

  test('Profile view shows correct fields', () => {
    const result = flow.handleViewProfile('patient_phone', {
      patientProfile: { name: 'Test', age: 30, gender: 'M' },
      selectedPersona: 'patient'
    });
    assert.strictEqual(result.nextState, 'profile_view', 'Should go to profile_view');
  });

  test('Role application flow', () => {
    const result = flow.handleRoleApplicationSelection('1', 'user_phone');
    assert.strictEqual(result.nextState, 'profile_view', 'Should show role application menu');
  });
});

test.describe('Messaging System Audit', () => {
  test('Doctor message admin input', () => {
    const result = flow.handleDoctorMsgAdminInput('doctor_phone', 'Test message', { 
      selectedPersona: 'doctor', 
      flowState: 'doctor_msg_admin_input',
      doctorProfile: { name: 'Dr. Test' }
    });
    assert.strictEqual(result.nextState, 'doctor_menu', 'Should go to doctor_menu after message');
  });

  test('Admin message doctor input stays in state', () => {
    const result = flow.handleAdminMessageDoctorInput('doc_123 Hello', 'admin_phone', { 
      selectedPersona: 'admin', 
      flowState: 'admin_message_doctor_input'
    });
    assert.strictEqual(result.nextState, 'admin_message_doctor_input', 'Should stay in message input state');
  });
});

test.describe('Gateway/Permission Audit', () => {
  test('Super Admin can see Add Admin option', () => {
    adminRegistry.addAdmin('9999999999', 'system', '9999999999', 'super_admin', 'Super Admin');
    const isAdminSuperAdmin = adminRegistry.isSuperAdmin('9999999999');
    assert.strictEqual(isAdminSuperAdmin, true, 'Should be identified as super admin');
    adminRegistry.removeAdmin('9999999999');
  });

  test('Regular Admin cannot add admins', () => {
    adminRegistry.addAdmin('8888888888', 'system', '8888888888', 'admin', 'Admin User');
    const isSuper = adminRegistry.isSuperAdmin('8888888888');
    assert.strictEqual(isSuper, false, 'Regular admin should not be super admin');
    adminRegistry.removeAdmin('8888888888');
  });
});

test.describe('Payment Flow Audit', () => {
  test('Billing menu option 1 requests payment', () => {
    const result = flow.handleBillingSelection('1', 'patient_phone');
    assert.strictEqual(result.nextState, 'payment_pending', 'Option 1 should request payment link');
  });

  test('Billing menu option 2 checks payment status', () => {
    const result = flow.handleBillingSelection('2', 'patient_phone');
    assert.strictEqual(result.nextState, 'consultation', 'Option 2 should check payment status');
  });
});

test.describe('Doctor Management Audit', () => {
  test('List doctors', () => {
    adminRegistry.addAdmin('admin_phone', 'system', 'admin_phone', 'admin', 'Test Admin');
    const result = flow.listDoctors('admin_phone');
    assert.strictEqual(result.nextState, 'admin_doctor_management', 'Should show doctor list');
    adminRegistry.removeAdmin('admin_phone');
  });

  test('List pending doctors', () => {
    adminRegistry.addAdmin('admin_phone', 'system', 'admin_phone', 'admin', 'Test Admin');
    const result = flow.listPendingDoctors('admin_phone');
    assert.strictEqual(result.nextState, 'admin_doctor_management', 'Should show pending doctors');
    adminRegistry.removeAdmin('admin_phone');
  });

  test('Assign doctor flow', () => {
    const result = flow.handleAdminAssignDoctorInput('cons_123 doc_456', 'admin_phone', {});
    assert.ok(result.nextState === 'admin_doctor_management' || result.nextState.includes('admin'), 'Should complete assign doctor action');
  });

  test('Reassign doctor flow', () => {
    const result = flow.handleAdminReassignDoctorInput('cons_123 doc_789', 'admin_phone', {});
    assert.ok(result.nextState === 'admin_doctor_management' || result.nextState.includes('admin'), 'Should complete reassign doctor action');
  });

  test('Remove doctor flow', () => {
    const result = flow.handleAdminRemoveDoctorInput('doc_456', 'admin_phone', {});
    assert.ok(result.nextState === 'admin_doctor_management' || result.nextState.includes('admin'), 'Should complete remove doctor action');
  });

  test('Reject doctor flow', () => {
    const result = flow.handleAdminRejectDoctorInput('pending_123', 'admin_phone', {});
    assert.ok(result.nextState === 'admin_doctor_management' || result.nextState.includes('admin'), 'Should complete reject doctor action');
  });

  test('Invite doctor flow', () => {
    const result = flow.handleAdminInviteDoctorInput('Dr. Test, Oncology, 9876543210, breast', 'admin_phone', {});
    assert.ok(result.nextState === 'admin_doctor_management' || result.nextState.includes('admin'), 'Should complete invite doctor action');
  });

  test('Register doctor flow', () => {
    const result = flow.handleAdminRegisterDoctorInput('Dr. New, 9876543210, breast', 'admin_phone', {});
    assert.ok(result.nextState === 'admin_doctor_management' || result.nextState.includes('admin'), 'Should complete register doctor action');
  });
});

test.describe('Role Approval Audit', () => {
  test('Role approvals menu', () => {
    const result = flow.handleAdminRoleApprovalsSelection('1', 'admin_phone', {});
    assert.strictEqual(result.nextState, 'admin_role_approvals', 'Option 1 should view role applications');
  });

  test('Approve doctor flow', () => {
    const result = flow.handleAdminApproveDoctorInput('req_123', 'admin_phone', {});
    assert.ok(result.nextState === 'admin_role_approvals' || result.nextState.includes('admin'), 'Should go to role approvals after approve');
  });

  test('Approve caregiver flow', () => {
    const result = flow.handleAdminApproveCaregiverInput('req_456', 'admin_phone', {});
    assert.ok(result.nextState === 'admin_role_approvals' || result.nextState.includes('admin'), 'Should go to role approvals after approve');
  });

  test('Approve support flow', () => {
    const result = flow.handleAdminApproveSupportInput('req_789', 'admin_phone', {});
    assert.ok(result.nextState === 'admin_role_approvals' || result.nextState.includes('admin'), 'Should go to role approvals after approve');
  });
});

test.describe('Admin Management Audit', () => {
  test('Add admin input handler exists', () => {
    const result = flow.handleAdminAddAdminInput('9876543210', 'super_admin_phone', {});
    assert.strictEqual(result.nextState, 'admin_add_admin_input', 'Should be in add admin input state');
  });

  test('Remove admin input handler exists', () => {
    const result = flow.handleAdminRemoveAdminInput('9876543210', 'super_admin_phone', {});
    assert.strictEqual(result.nextState, 'admin_remove_admin_input', 'Should be in remove admin input state');
  });
});

test.describe('State Verification', () => {
  test('SUPER_ADMIN_MENU state exists', () => {
    assert.strictEqual(FlowStates.SUPER_ADMIN_MENU, 'super_admin_menu', 'SUPER_ADMIN_MENU state should exist');
  });

  test('Admin and Super Admin have separate states', () => {
    assert.notStrictEqual(FlowStates.ADMIN_MENU, FlowStates.SUPER_ADMIN_MENU, 'Admin and Super Admin should have separate menu states');
  });

  test('All domain states are defined', () => {
    const requiredStates = [
      { key: 'ADMIN_MENU', value: 'admin_menu' },
      { key: 'SUPER_ADMIN_MENU', value: 'super_admin_menu' },
      { key: 'DOCTOR_MENU', value: 'doctor_menu' },
      { key: 'SUPPORT_MENU', value: 'support_menu' },
      { key: 'ADMIN_DOCTOR_MANAGEMENT', value: 'admin_doctor_management' },
      { key: 'ADMIN_ROLE_APPROVALS', value: 'admin_role_approvals' },
      { key: 'PROFILE_VIEW', value: 'profile_view' },
      { key: 'PERSONA_SELECT', value: 'persona_select' },
      { key: 'CONSULTATION', value: 'consultation' },
      { key: 'BILLING', value: 'billing' }
    ];
    requiredStates.forEach(({ key, value }) => {
      assert.strictEqual(FlowStates[key], value, `State ${value} should exist as ${key}`);
    });
  });
});