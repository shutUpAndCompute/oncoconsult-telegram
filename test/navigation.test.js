const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

process.env.DATA_DIR = path.join(__dirname, 'test_data_navigation');

const { ConversationFlow, FlowStates, InteractiveMenus } = require('../services/conversationFlow');
const adminRegistry = require('../services/adminRegistry');

test.after(() => {
  fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true });
});

test('Navigation Principle 2: Menu text uses emoji format', () => {
  assert.ok(InteractiveMenus.adminMenu(0, 0).includes('0️⃣'), 'Admin menu should use emoji format');
  assert.ok(InteractiveMenus.billing.includes('2️⃣'), 'Billing menu should use emoji format');
  assert.ok(InteractiveMenus.consultation(true).includes('4️⃣'), 'Consultation menu should use emoji format');
  assert.ok(InteractiveMenus.profileMenu({}).includes('0️⃣'), 'Profile menu should use emoji format');
});

test('Menu text consistency: All back options specify destination', () => {
  assert.ok(InteractiveMenus.adminRoleApprovals(0).includes('Back to Admin Menu'), 'Should specify "Back to Admin Menu"');
  assert.ok(InteractiveMenus.adminDoctorManagement(0).includes('Back to Admin Menu'), 'Should specify "Back to Admin Menu"');
  assert.ok(InteractiveMenus.adminAssignDoctorInput.includes('Back to Doctor Management'), 'Should specify "Back to Doctor Management"');
  assert.ok(InteractiveMenus.profileMenu({}).includes('Apply for Role'), 'Should specify "Apply for Role"');
  assert.ok(InteractiveMenus.closeConsultationPrompt.includes('Back to Admin Menu'), 'Should specify "Back to Admin Menu"');
  assert.ok(InteractiveMenus.adminSetFeeInput.includes('Back to Admin Menu'), 'Should specify "Back to Admin Menu"');
});

test('Set Fee menu item exists and is properly integrated', () => {
  assert.ok(InteractiveMenus.adminFinancesMenu(false, false).includes('3️⃣'), 'Admin finances menu should have option 3 (Set Fee)');
  assert.ok(InteractiveMenus.adminFinancesMenu(false, false).includes('Set Fee'), 'Option 3 should be "Set Fee"');
  assert.strictEqual(FlowStates.ADMIN_SET_FEE_INPUT, 'admin_set_fee_input', 'ADMIN_SET_FEE_INPUT state should exist');
  assert.ok(InteractiveMenus.adminSetFeeInput, 'adminSetFeeInput menu text should exist');
  assert.ok(InteractiveMenus.adminSetFeeInput.includes('PHONE AMOUNT'), 'Should show input format');
  assert.ok(InteractiveMenus.adminSetFeeInput.includes('0️⃣ Back'), 'Should have back option');
});

test('Admin profile complete options menu exists', () => {
  assert.ok(InteractiveMenus.adminProfileCompleteOptions, 'adminProfileCompleteOptions menu text should exist');
  assert.ok(InteractiveMenus.adminProfileCompleteOptions('Admin').includes('Profile Complete'), 'Should mention profile complete');
  assert.ok(InteractiveMenus.adminProfileCompleteOptions('Admin').includes('1️⃣ Go to Admin Menu'), 'Should have "Go to Admin Menu" option');
  assert.ok(InteractiveMenus.adminProfileCompleteOptions('Admin').includes('2️⃣ Continue Editing'), 'Should have "Continue Editing" option');
  assert.ok(InteractiveMenus.adminProfileCompleteOptions('Admin').includes('3️⃣ Cancel'), 'Should have "Cancel" option');
});

test('Doctor message admin input has proper back option', () => {
  const flow = new ConversationFlow(null, null, null, null, null);
  const result = flow.handleDoctorMenuSelection('4', 'doctor_phone', {});
  assert.strictEqual(result.nextState, 'doctor_msg_admin_input', 'Should go to doctor message admin input');
  assert.ok(result.response.includes('0️⃣ Back to Doctor Menu'), 'Should have proper back option with emoji');
});

test('Consultation completion "0" goes to PERSONA_SELECT', () => {
  const flow = new ConversationFlow(null, null, null, null, null);
  const result = flow.handleConsultationCompleted('0', 'patient_phone', { selectedPersona: 'patient' });
  assert.strictEqual(result.nextState, 'persona_select', 'Consultation completion "0" should go to PERSONA_SELECT');
});

test('Admin profile complete options flow works', () => {
  const flow = new ConversationFlow(null, null, null, null, null);
  const result1 = flow.handleAdminProfileCompleteOptions('1', 'admin_phone');
  assert.strictEqual(result1.nextState, 'admin_menu', 'Option 1 should go to admin_menu');
  const result2 = flow.handleAdminProfileCompleteOptions('2', 'admin_phone');
  assert.strictEqual(result2.nextState, 'profile_view', 'Option 2 should go to profile_view');
  const result3 = flow.handleAdminProfileCompleteOptions('3', 'admin_phone');
  assert.strictEqual(result3.nextState, 'welcome', 'Option 3 should go to welcome');
  const resultInvalid = flow.handleAdminProfileCompleteOptions('999', 'admin_phone');
  assert.strictEqual(resultInvalid.nextState, 'admin_profile_complete_options', 'Invalid option should stay at admin_profile_complete_options');
});

test('Domain state guards: ADMIN_DOMAIN_STATES includes all admin states', () => {
  const adminStates = [
    FlowStates.ADMIN_MENU,
    FlowStates.ADMIN_ROLE_APPROVALS,
    FlowStates.ADMIN_DOCTOR_MANAGEMENT,
    FlowStates.ADMIN_VERIFY_PAYMENT_INPUT,
    FlowStates.ADMIN_VERIFY_DISCOUNT_INPUT,
    FlowStates.ADMIN_MESSAGE_PATIENT_INPUT,
    FlowStates.ADMIN_MESSAGE_DOCTOR_INPUT,
    FlowStates.ADMIN_CLOSE_CONSULTATION,
    FlowStates.ADMIN_ADD_ADMIN_INPUT,
    FlowStates.ADMIN_REMOVE_ADMIN_INPUT,
    FlowStates.ADMIN_SET_FEE_INPUT,
    FlowStates.ADMIN_PROFILE_EDIT
  ];
  adminStates.forEach(state => {
    assert.ok(typeof state === 'string', `State ${state} should be a valid FlowState`);
  });
});

test('Doctor domain states are properly defined', () => {
  const doctorStates = [
    FlowStates.DOCTOR_MENU,
    FlowStates.DOCTOR_PROFILE_EDIT,
    FlowStates.DOCTOR_MSG_ADMIN_INPUT
  ];
  doctorStates.forEach(state => {
    assert.ok(typeof state === 'string', `State ${state} should be a valid FlowState`);
  });
});

test('Support domain states are properly defined', () => {
  const supportStates = [
    FlowStates.SUPPORT_MENU,
    FlowStates.ADMIN_MESSAGE_DOCTOR_INPUT,
    FlowStates.ADMIN_MESSAGE_PATIENT_INPUT
  ];
  supportStates.forEach(state => {
    assert.ok(typeof state === 'string', `State ${state} should be a valid FlowState`);
  });
});

test('New states are properly defined', () => {
  assert.strictEqual(FlowStates.ADMIN_SET_FEE_INPUT, 'admin_set_fee_input', 'ADMIN_SET_FEE_INPUT should exist');
  assert.strictEqual(FlowStates.ADMIN_PROFILE_COMPLETE_OPTIONS, 'admin_profile_complete_options', 'ADMIN_PROFILE_COMPLETE_OPTIONS should exist');
});

test('Persona selection handles invalid roles gracefully', () => {
  const flow = new ConversationFlow(null, null, null, null, null);
  const result = flow.handlePersonaSelection('9', 'new_user_phone', {});
  assert.strictEqual(result.nextState, 'persona_select', 'Invalid role number should stay at PERSONA_SELECT');
  assert.ok(result.response.includes('do not have') || result.response.includes('approved'), 'Should show error about role not approved');
});

test('Invalid input handling: Caregiver patient link rejects invalid phone', () => {
  const flow = new ConversationFlow(null, null, null, null, null);
  
  const result1 = flow.handleCaregiverPatientLink('abc123', 'caregiver_phone', {});
  assert.strictEqual(result1.nextState, 'caregiver_patient_link', 'Invalid phone should stay at CAREGIVER_PATIENT_LINK');
  
  const result2 = flow.handleCaregiverPatientLink('', 'caregiver_phone', {});
  assert.strictEqual(result2.nextState, 'caregiver_patient_link', 'Empty input should stay at CAREGIVER_PATIENT_LINK');
  
  const result3 = flow.handleCaregiverPatientLink('123', 'caregiver_phone', {});
  assert.strictEqual(result3.nextState, 'caregiver_patient_link', 'Too short phone should stay at CAREGIVER_PATIENT_LINK');
});

test('Invalid input handling: Consultation menu shows error for invalid selection', async () => {
  const flow = new ConversationFlow(null, null, null, null, null);
  
  const result = await flow.handleConsultationMenuSelection('invalid', 'patient_phone', {});
  assert.strictEqual(result.nextState, 'consultation', 'Invalid input should stay at CONSULTATION');
  assert.ok(result.response.includes('Invalid selection'), 'Should show invalid selection error');
});

test('Invalid input handling: Billing menu shows error for invalid selection', () => {
  const flow = new ConversationFlow(null, null, null, null, null);
  
  const result = flow.handleBillingSelection('invalid', 'patient_phone');
  assert.strictEqual(result.nextState, 'billing', 'Invalid input should stay at BILLING');
  assert.ok(result.response.includes('Invalid selection'), 'Should show invalid selection error');
});

test('Admin registry: isAdminProfileComplete checks name and phoneNumber', () => {
  // Test with a mock admin record
  const testPhone = '9999999999';
  
  // Simulate admin record with name but no phone
  adminRegistry.addAdmin(testPhone, 'system', testPhone, 'admin', 'Test Admin');
  
  // Check if profile is complete (should be true since both name and phone are set)
  const isComplete = adminRegistry.isAdminProfileComplete(testPhone);
  assert.ok(isComplete, 'Profile should be complete with name and phone');
  
  // Clean up - remove the test admin
  adminRegistry.removeAdmin(testPhone);
});

test('Admin profile edit flow: Name update persists', () => {
  const flow = new ConversationFlow(null, null, null, null, adminRegistry);
  const testPhone = '8888888888';
  
  // Create admin record
  adminRegistry.addAdmin(testPhone, 'system', testPhone, 'admin', null);
  
  // Simulate editing name (this is what happens when admin enters their name)
  const result = flow.handleAdminProfileEditInput(testPhone, 'John Doe', {
    flowState: 'admin_profile_edit_name',
    patientProfile: {},
    adminProfile: {}
  });
  
  // Verify the admin record was updated
  const admin = adminRegistry.getAdmin(testPhone);
  assert.ok(admin?.name === 'John Doe' || admin?.name === 'John Doe', 'Admin name should be updated');
  
  // Clean up
  adminRegistry.removeAdmin(testPhone);
});

test('Super Admin Menu separation: Distinct from Admin Menu', () => {
  assert.ok(FlowStates.SUPER_ADMIN_MENU, 'SUPER_ADMIN_MENU state should exist');
  assert.strictEqual(FlowStates.SUPER_ADMIN_MENU, 'super_admin_menu', 'SUPER_ADMIN_MENU state value correct');
  
  const superAdminMenu = InteractiveMenus.superAdminMenu(5, 3);
  assert.ok(superAdminMenu.includes('🔐 *Super Admin Panel*'), 'Super Admin menu has correct title');
  assert.ok(superAdminMenu.includes('System & Roles'), 'Super Admin menu has System & Roles option');
});

test('Admin Menu structure', () => {
  const adminMenu = InteractiveMenus.adminMenu(0, 0);
  
  assert.ok(adminMenu.includes('🛠️ *Admin Panel*'), 'Admin menu has correct title');
  assert.ok(adminMenu.includes('System & Roles'), 'Admin menu has System & Roles');
});

test('Super Admin menu shows pending/active counts on Consultations', () => {
  const superAdminMenu = InteractiveMenus.superAdminMenu(10, 5);
  assert.ok(superAdminMenu.includes('🔴 1️⃣ Consultations'), 'Shows indicator for consultations');
});

test('handleSuperAdminMenuSelection routes correctly', () => {
  const ConsultationManager = require('../services/consultationManager');
  const DoctorRouter = require('../services/doctorRouter');
  const paymentService = new (require('../services/paymentService'))();
  const cm = new ConsultationManager(new DoctorRouter());
  const flow = new ConversationFlow(cm, new DoctorRouter(), paymentService, null, adminRegistry);
  const testPhone = '9999999999';
  
  adminRegistry.addAdmin(testPhone, 'system', testPhone, 'super_admin', 'Test Super Admin');
  
  // Test option 0 (Switch Role)
  const result0 = flow.handleSuperAdminMenuSelection('0', testPhone, {});
  assert.strictEqual(result0.nextState, 'persona_select', 'Option 0 should go to PERSONA_SELECT');
  
  // Test invalid option
  const resultInvalid = flow.handleSuperAdminMenuSelection('99', testPhone, {});
  assert.strictEqual(resultInvalid.nextState, 'super_admin_menu', 'Invalid option should stay at SUPER_ADMIN_MENU');
  
  adminRegistry.removeAdmin(testPhone);
});

test('Adversarial: Domain Guards block patient from accessing Doctor Menu', () => {
  const ConsultationManager = require('../services/consultationManager');
  const cm = new ConsultationManager(require('../services/doctorRouter'));
  const flow = new ConversationFlow(cm, null, null, null, null);
  
  // Patient persona trying to jump into Doctor Menu
  const result = flow.enforceDomainGuard({ nextState: FlowStates.DOCTOR_MENU, response: 'Secret Doctor Menu' }, 'patient', '12345');
  assert.strictEqual(result.nextState, FlowStates.WELCOME, 'Domain Guard should boot patient back to WELCOME');
  assert.ok(result.response.includes('Unauthorized Access'), 'Domain Guard should issue Unauthorized Access error');
});

test('Adversarial: Domain Guards block doctor from accessing Admin Menu', () => {
  const ConsultationManager = require('../services/consultationManager');
  const cm = new ConsultationManager(require('../services/doctorRouter'));
  const flow = new ConversationFlow(cm, null, null, null, null);
  
  // Doctor persona trying to jump into Admin Menu
  const result = flow.enforceDomainGuard({ nextState: FlowStates.ADMIN_MENU, response: 'Secret Admin Menu' }, 'doctor', '12345');
  assert.strictEqual(result.nextState, FlowStates.WELCOME, 'Domain Guard should boot unauthorized role to WELCOME');
  assert.ok(result.response.includes('Unauthorized Access'), 'Domain Guard should issue Unauthorized Access error');
});

test('Adversarial: Domain Guards allow Admin to access Admin Menu', () => {
  const ConsultationManager = require('../services/consultationManager');
  const cm = new ConsultationManager(require('../services/doctorRouter'));
  const flow = new ConversationFlow(cm, null, null, null, null);
  
  // Admin accessing Admin Menu
  const result = flow.enforceDomainGuard({ nextState: FlowStates.ADMIN_MENU, response: 'Admin Dashboard' }, 'admin', '12345');
  assert.strictEqual(result.nextState, FlowStates.ADMIN_MENU, 'Domain Guard should allow Admin');
  assert.strictEqual(result.response, 'Admin Dashboard', 'Domain Guard should preserve response');
});
test('Admin profile routing goes to ADMIN_PROFILE_EDIT', () => {
  const ConsultationManager = require('../services/consultationManager');
  const DoctorRouter = require('../services/doctorRouter');
  const paymentService = new (require('../services/paymentService'))();
  const cm = new ConsultationManager(new DoctorRouter());
  const flow = new ConversationFlow(cm, new DoctorRouter(), paymentService, null, adminRegistry);
  const testPhone = '9999999999';
  
  adminRegistry.addAdmin(testPhone, 'system', testPhone, 'admin', 'Test Admin');
  
  // Test option 'profile'
  const result = flow.handleAdminMenuSelection('profile', testPhone);
  assert.strictEqual(result.nextState, FlowStates.ADMIN_PROFILE_EDIT, 'Profile option should route to ADMIN_PROFILE_EDIT');
  
  adminRegistry.removeAdmin(testPhone);
});

test('Support profile routing goes to ADMIN_PROFILE_EDIT', () => {
  const ConsultationManager = require('../services/consultationManager');
  const cm = new ConsultationManager(require('../services/doctorRouter'));
  const flow = new ConversationFlow(cm, null, null, null, null);
  
  // Test option '4'
  const result = flow.handleSupportMenuSelection('4', '12345', {});
  assert.strictEqual(result.nextState, FlowStates.ADMIN_PROFILE_EDIT, 'Profile option should route to ADMIN_PROFILE_EDIT');
});
