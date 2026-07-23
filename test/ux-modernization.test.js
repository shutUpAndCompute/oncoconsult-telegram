const assert = require('node:assert');
const { test } = require('node:test');
const { ConversationFlow, FlowStates } = require('../services/conversationFlow');
const telegramKeyboards = require('../services/telegramKeyboards');
const ConsultationManager = require('../services/consultationManager');
const DoctorRouter = require('../services/doctorRouter');
const PaymentService = require('../services/paymentService');
const UserRegistry = require('../services/userRegistry');
const adminRegistry = require('../services/adminRegistry');

const consultationManager = new ConsultationManager(new DoctorRouter());
const doctorRouter = new DoctorRouter();
const paymentService = new PaymentService();
const userRegistry = new UserRegistry();

const conversationFlow = new ConversationFlow(consultationManager, doctorRouter, paymentService, userRegistry, adminRegistry);

function clearTestSessions() {
  consultationManager.sessions.clear();
}

function setupWelcomeSession(chatId) {
  consultationManager.updateSession(chatId, { 
    flowState: FlowStates.WELCOME,
    patientProfile: { platformTermsAccepted: true }
  });
}

test('Dual-Support Contract: Welcome Menu - Text Input Navigation', async () => {
  clearTestSessions();
  setupWelcomeSession('1234567890');
  
  const chatId = '1234567890';
  
  const result = await conversationFlow.createFlowHandler(chatId, '1');
  assert.strictEqual(result.nextState, FlowStates.CONSULTATION, 'Text input "1" should navigate to CONSULTATION');
});

test('Dual-Support Contract: Welcome Menu - Profile View', async () => {
  clearTestSessions();
  setupWelcomeSession('1234567891');
  
  const chatId = '1234567891';
  
  const result = await conversationFlow.createFlowHandler(chatId, '2');
  assert.strictEqual(result.nextState, FlowStates.PROFILE_VIEW, 'Text input "2" should navigate to PROFILE_VIEW');
});

test('Dual-Support Contract: Welcome Menu - Cancel', async () => {
  clearTestSessions();
  setupWelcomeSession('1234567892');
  
  const chatId = '1234567892';
  
  const result = await conversationFlow.createFlowHandler(chatId, '0');
  assert.strictEqual(result.nextState, FlowStates.WELCOME, 'Text input "0" should cancel and return to WELCOME');
});

test('Callback Query: Persona Select - "0" returns to WELCOME', async () => {
  clearTestSessions();
  
  const chatId = '111222333';
  consultationManager.updateSession(chatId, { 
    flowState: FlowStates.PERSONA_SELECT,
    patientProfile: { platformTermsAccepted: true }
  });
  
  const result = await conversationFlow.createFlowHandler(chatId, '0');
  assert.strictEqual(result.nextState, FlowStates.WELCOME, 'Persona select "0" should navigate to WELCOME');
});

test('Callback Query: Role Select - "0" returns to WELCOME', async () => {
  clearTestSessions();
  
  const chatId = '444555666';
  consultationManager.updateSession(chatId, { 
    flowState: FlowStates.ROLE_SELECT,
    patientProfile: { platformTermsAccepted: true }
  });
  
  const result = await conversationFlow.createFlowHandler(chatId, '0');
  assert.strictEqual(result.nextState, FlowStates.WELCOME, 'Role select "0" should navigate to WELCOME');
});

test('Callback Query: Profile View - Menu Navigation', async () => {
  clearTestSessions();
  
  const chatId = '777888999';
  consultationManager.updateSession(chatId, { 
    flowState: FlowStates.PROFILE_VIEW,
    patientProfile: { platformTermsAccepted: true }
  });
  
  const result = await conversationFlow.createFlowHandler(chatId, '1');
  assert.strictEqual(result.nextState, FlowStates.PROFILE_VIEW, 'Profile view "1" should stay at PROFILE_VIEW');
});

test('Callback Query: Doctor Menu - "0" returns to Persona Select', async () => {
  clearTestSessions();
  
  const chatId = '555666777';
  consultationManager.updateSession(chatId, { 
    flowState: FlowStates.DOCTOR_MENU,
    profileStep: null,
    patientProfile: { platformTermsAccepted: true }
  });
  
  const result = await conversationFlow.createFlowHandler(chatId, '0');
  assert.strictEqual(result.nextState, FlowStates.PERSONA_SELECT, 'Doctor menu "0" should navigate to PERSONA_SELECT');
});

test('Callback Query: Admin Menu - "0" returns to Persona Select', async () => {
  clearTestSessions();
  
  const chatId = '999888777';
  const originalIsAdmin = adminRegistry.isAdmin;
  adminRegistry.isAdmin = () => true;
  adminRegistry.isAdminProfileComplete = () => true;
  
  consultationManager.updateSession(chatId, { 
    flowState: FlowStates.ADMIN_MENU,
    patientProfile: { platformTermsAccepted: true }
  });
  
  const result = await conversationFlow.createFlowHandler(chatId, '0');
  
  adminRegistry.isAdmin = originalIsAdmin;
  assert.strictEqual(result.nextState, FlowStates.PERSONA_SELECT, 'Admin menu "0" should navigate to PERSONA_SELECT');
});

test('Payload Size Limits: All Keyboard Builders Must Be Under 64 Bytes', () => {
  const keyboards = [
    { name: 'buildMainMenu', fn: () => telegramKeyboards.buildMainMenu() },
    { name: 'buildPersonaSelect', fn: () => telegramKeyboards.buildPersonaSelect('patient', ['caregiver', 'doctor']) },
    { name: 'buildAdminMenu', fn: () => telegramKeyboards.buildAdminMenu(5, 10, true, false, false, 2, 3) },
    { name: 'buildSuperAdminMenu', fn: () => telegramKeyboards.buildSuperAdminMenu(5, 10, true, false, false, 2, 3) },
    { name: 'buildCancerTypeMenu', fn: () => telegramKeyboards.buildCancerTypeMenu() },
    { name: 'buildConsultationMenu', fn: () => telegramKeyboards.buildConsultationMenu() },
    { name: 'buildDoctorMenu', fn: () => telegramKeyboards.buildDoctorMenu('Dr. Smith', false, 0) },
    { name: 'buildAdminRoleApprovals', fn: () => telegramKeyboards.buildAdminRoleApprovals(5) },
    { name: 'buildAdminDoctorManagement', fn: () => telegramKeyboards.buildAdminDoctorManagement(3) },
    { name: 'buildBillingMenu', fn: () => telegramKeyboards.buildBillingMenu() },
    { name: 'buildProfileView', fn: () => telegramKeyboards.buildProfileView() },
    { name: 'buildRoleSelect', fn: () => telegramKeyboards.buildRoleSelect() },
    { name: 'buildCaregiverAuth', fn: () => telegramKeyboards.buildCaregiverAuth() },
    { name: 'buildPlatformTerms', fn: () => telegramKeyboards.buildPlatformTerms() },
    { name: 'buildProfileView', fn: () => telegramKeyboards.buildProfileView({ name: 'Test' }) },
    { name: 'buildProfileEdit', fn: () => telegramKeyboards.buildProfileEdit() },
    { name: 'buildRoleApplication', fn: () => telegramKeyboards.buildRoleApplication() },
    { name: 'buildMyRoles', fn: () => telegramKeyboards.buildMyRoles(['doctor'], {}) },
    { name: 'buildProfileRemoveRole', fn: () => telegramKeyboards.buildProfileRemoveRole() },
    { name: 'buildDiscountPrimary', fn: () => telegramKeyboards.buildDiscountPrimary() },
    { name: 'buildDiscountEconomic', fn: () => telegramKeyboards.buildDiscountEconomic() },
    { name: 'buildDiscountProfession', fn: () => telegramKeyboards.buildDiscountProfession() },
    { name: 'buildDiscountSocial', fn: () => telegramKeyboards.buildDiscountSocial() },
    { name: 'buildConsentsMenu', fn: () => telegramKeyboards.buildConsentsMenu() },
    { name: 'buildDoctorSelect', fn: () => telegramKeyboards.buildDoctorSelect([]) },
    { name: 'buildConsultationCompleted', fn: () => telegramKeyboards.buildConsultationCompleted() },
    { name: 'buildCloseConsultationPrompt', fn: () => telegramKeyboards.buildCloseConsultationPrompt() },
    { name: 'buildMobileCollection', fn: () => telegramKeyboards.buildMobileCollection() },
    { name: 'buildCaregiverPatientLink', fn: () => telegramKeyboards.buildCaregiverPatientLink() },
    { name: 'buildAdminProfileEdit', fn: () => telegramKeyboards.buildAdminProfileEdit() },
    { name: 'buildAdminProfileEditName', fn: () => telegramKeyboards.buildAdminProfileEditName() },
    { name: 'buildAdminProfileEditPhone', fn: () => telegramKeyboards.buildAdminProfileEditPhone() },
    { name: 'buildDoctorProfileEdit', fn: () => telegramKeyboards.buildDoctorProfileEdit() },
    { name: 'buildDoctorMsgAdminInput', fn: () => telegramKeyboards.buildDoctorMsgAdminInput() },
    { name: 'buildAdminAssignDoctorInput', fn: () => telegramKeyboards.buildAdminAssignDoctorInput() },
    { name: 'buildAdminRemoveDoctorInput', fn: () => telegramKeyboards.buildAdminRemoveDoctorInput() },
    { name: 'buildAdminRejectDoctorInput', fn: () => telegramKeyboards.buildAdminRejectDoctorInput() },
    { name: 'buildAdminMessageDoctorInput', fn: () => telegramKeyboards.buildAdminMessageDoctorInput() },
    { name: 'buildAdminReassignDoctorInput', fn: () => telegramKeyboards.buildAdminReassignDoctorInput() },
    { name: 'buildAdminMessagePatientInput', fn: () => telegramKeyboards.buildAdminMessagePatientInput() },
    { name: 'buildAdminVerifyPaymentInput', fn: () => telegramKeyboards.buildAdminVerifyPaymentInput() },
    { name: 'buildAdminVerifyDiscountInput', fn: () => telegramKeyboards.buildAdminVerifyDiscountInput() },
    { name: 'buildAdminInviteDoctorInput', fn: () => telegramKeyboards.buildAdminInviteDoctorInput() },
    { name: 'buildAdminRegisterDoctorInput', fn: () => telegramKeyboards.buildAdminRegisterDoctorInput() },
    { name: 'buildAdminApproveDoctorInput', fn: () => telegramKeyboards.buildAdminApproveDoctorInput() },
    { name: 'buildAdminApproveCaregiverInput', fn: () => telegramKeyboards.buildAdminApproveCaregiverInput() },
    { name: 'buildAdminApproveSupportInput', fn: () => telegramKeyboards.buildAdminApproveSupportInput() },
    { name: 'buildAdminAddAdminInput', fn: () => telegramKeyboards.buildAdminAddAdminInput() },
    { name: 'buildAdminRemoveAdminInput', fn: () => telegramKeyboards.buildAdminRemoveAdminInput() },
    { name: 'buildAdminSetFeeInput', fn: () => telegramKeyboards.buildAdminSetFeeInput() },
    { name: 'buildPendingRequests', fn: () => telegramKeyboards.buildPendingRequests(5) },
    { name: 'buildActiveConsultations', fn: () => telegramKeyboards.buildActiveConsultations() },
    { name: 'buildViewAllPatients', fn: () => telegramKeyboards.buildViewAllPatients([]) },
    { name: 'buildViewLinkedPatients', fn: () => telegramKeyboards.buildViewLinkedPatients([]) },
    { name: 'buildDoctorStatus', fn: () => telegramKeyboards.buildDoctorStatus() },
    { name: 'buildWithdrawalConfirm', fn: () => telegramKeyboards.buildWithdrawalConfirm() },
    { name: 'buildReportUpload', fn: () => telegramKeyboards.buildReportUpload() },
    { name: 'buildProfileDiscountDocuments', fn: () => telegramKeyboards.buildProfileDiscountDocuments() },
  ];
  
  for (const { name, fn } of keyboards) {
    let result;
    try {
      result = fn();
    } catch (e) {
      assert.fail(`${name} failed: ${e.message}`);
      continue;
    }
    
    if (result.reply_markup && Array.isArray(result.reply_markup.inline_keyboard)) {
      for (const row of result.reply_markup.inline_keyboard) {
        for (const button of row) {
          const text = typeof button === 'string' ? button : button.text || '';
          assert.ok(text.length <= 64, `${name}: Button text exceeds 64 bytes: "${text}" (${text.length} chars)`);
        }
      }
    }
    
    if (result.text) {
      assert.ok(result.text.length <= 4096, `${name}: Response text exceeds 4096 bytes`);
    }
  }
});

test('Payload Structure Validation', () => {
  const menu = telegramKeyboards.buildMainMenu('patient', true);
  assert.ok(menu.reply_markup, 'Menu should have reply_markup');
  assert.ok(Array.isArray(menu.reply_markup.inline_keyboard), 'Should have inline_keyboard array');
  assert.ok(menu.reply_markup.inline_keyboard.length > 0, 'Should have at least one row');
});

test('Dual-Support Contract: Platform Terms Flow', async () => {
  clearTestSessions();
  
  const chatId = '1234567893';
  consultationManager.updateSession(chatId, { 
    flowState: FlowStates.WELCOME,
    patientProfile: { platformTermsAccepted: false }
  });
  
  const result = await conversationFlow.createFlowHandler(chatId, '1');
  assert.strictEqual(result.nextState, FlowStates.PLATFORM_TERMS, 'Should route to PLATFORM_TERMS when terms not accepted');
});

test('Dual-Support Contract: Platform Terms - Accept', async () => {
  clearTestSessions();
  
  const chatId = '1234567894';
  consultationManager.updateSession(chatId, { 
    flowState: FlowStates.PLATFORM_TERMS,
    patientProfile: {},
    profileStep: 'completed'
  });
  
  const result = await conversationFlow.createFlowHandler(chatId, '1');
  assert.strictEqual(result.nextState, FlowStates.WELCOME, 'Accepting terms should return to WELCOME');
});

test('Payload Size: Callback Data Must Be Under 64 Bytes', () => {
  const testPayloads = [
    'welcome_consultation',
    'welcome_profile',
    'welcome_billing',
    'persona_patient',
    'persona_caregiver',
    'persona_doctor',
    'persona_admin',
    'persona_super_admin',
    'persona_support',
    'persona_cancel',
    'profile_view',
    'profile_edit',
    'profile_remove_role',
    'admin_menu',
    'admin_role_approvals',
    'admin_doctor_management',
    'admin_verify_payment',
    'admin_verify_discount',
    'doctor_menu',
    'support_menu',
    'cancer_lung',
    'cancer_breast',
    'cancer_prostate',
    'cancer_liver',
    'cancer_pancreatic',
    'cancer_ovarian',
    'cancer_blood',
    'cancer_other',
    'cancer_cancel',
    'billing_request',
    'billing_status',
    'consultation_start',
    'consultation_status',
    'consultation_withdraw',
  ];
  
  for (const payload of testPayloads) {
    assert.ok(payload.length <= 64, `Payload "${payload}" exceeds 64 bytes (${payload.length} chars)`);
  }
});

test('Dual-Support Contract: Missing Button Audit', async (t) => {
    const InteractiveMenus = require('../services/conversationFlow').InteractiveMenus;
    
    await t.test('should have 4 options plus cancel in Role Application keyboard', () => {
      const kb = telegramKeyboards.buildRoleApplication().reply_markup.inline_keyboard;
      assert.strictEqual(kb.length, 4);
      const text = InteractiveMenus.roleApplication;
      assert.match(text, /1️⃣ Doctor/);
      assert.match(text, /4️⃣ Cancel/);
    });

    await t.test('should have 4 options in Admin Profile Edit keyboard', () => {
      const kb = telegramKeyboards.buildAdminProfileEdit().reply_markup.inline_keyboard;
      assert.strictEqual(kb.length, 4);
      const text = InteractiveMenus.adminProfileEdit([]);
      assert.match(text, /1️⃣ Edit Name/);
      assert.match(text, /3️⃣ View Profile/);
    });

    await t.test('should match Consultation Completed text', () => {
      const kb = telegramKeyboards.buildConsultationCompleted().reply_markup.inline_keyboard;
      assert.strictEqual(kb.length, 3);
      assert.strictEqual(kb[0][0].callback_data, 'consultation');
      assert.strictEqual(kb[1][0].callback_data, 'view_profile');
      assert.strictEqual(kb[2][0].callback_data, 'main_menu');
    });

    await t.test('should include Back to Menu in Doctor Selection', () => {
      const kb = telegramKeyboards.buildDoctorSelect([{id: '123', name: 'Test'}]).reply_markup.inline_keyboard;
      assert.strictEqual(kb.length, 2);
      assert.strictEqual(kb[1][0].callback_data, 'main_menu');
    });

    await t.test('should match Role Selection text', () => {
      const kb = telegramKeyboards.buildRoleSelect().reply_markup.inline_keyboard;
      assert.strictEqual(kb.length, 4);
      const text = InteractiveMenus.roleSelect;
      assert.match(text, /1️⃣ Patient/);
      assert.match(text, /3️⃣ Doctor/);
    });

    await t.test('should have properly structured Discount Sub-Menus', () => {
      const kbPrimary = telegramKeyboards.buildDiscountPrimary().reply_markup.inline_keyboard;
      assert.strictEqual(kbPrimary.length, 5); // 4 category options + 0️⃣ Back
      assert.match(InteractiveMenus.discountCategories, /Economic \& Schemes/);

      const kbEconomic = telegramKeyboards.buildDiscountEconomic().reply_markup.inline_keyboard;
      assert.strictEqual(kbEconomic.length, 6);
      assert.match(InteractiveMenus.discountEconomic, /Ayushman Bharat/);

      const kbProfession = telegramKeyboards.buildDiscountProfession().reply_markup.inline_keyboard;
      assert.strictEqual(kbProfession.length, 8);
      assert.match(InteractiveMenus.discountProfession, /Paramilitary/);

      const kbSocial = telegramKeyboards.buildDiscountSocial().reply_markup.inline_keyboard;
      assert.strictEqual(kbSocial.length, 6);
      assert.match(InteractiveMenus.discountSocial, /Minority Community/);
    });
  });

  test('UX Modernization: Red-Dot Breadcrumb Indicator Logic', async (t) => {
    await t.test('MainMenu: profileComplete=false highlights Profile & Roles', () => {
      const kb = telegramKeyboards.buildMainMenu('patient', false, false).reply_markup.inline_keyboard;
      // Index 1 should be Profile & Roles with red dot
      assert.match(kb[1][0].text, /🔴.*Profile & Roles/);
      assert.doesNotMatch(kb[0][0].text, /🔴.*My Consultations/);
    });

    await t.test('MainMenu: profileComplete=true does not highlight', () => {
      const kb = telegramKeyboards.buildMainMenu('patient', false, true).reply_markup.inline_keyboard;
      assert.doesNotMatch(kb[1][0].text, /🔴/);
      assert.doesNotMatch(kb[0][0].text, /🔴/);
    });
  });

  test('UX Modernization: Discount Sub-Menu Navigation', async (t) => {
    const chatId = 'test_discount_nav_user';
    
    await t.test('Transitions to Economic sub-menu on 1', async () => {
      setupWelcomeSession(chatId);
      consultationManager.updateSession(chatId, { flowState: FlowStates.PROFILE_DISCOUNT_CATEGORY });
      
      const result = await conversationFlow.createFlowHandler(chatId, '1');
      assert.strictEqual(result.nextState, FlowStates.PROFILE_DISCOUNT_ECONOMIC);
      assert.match(result.response, /Economic & Schemes/);
    });

    await t.test('Transitions to Profession sub-menu on 2', async () => {
      consultationManager.updateSession(chatId, { flowState: FlowStates.PROFILE_DISCOUNT_CATEGORY });
      
      const result = await conversationFlow.createFlowHandler(chatId, '2');
      assert.strictEqual(result.nextState, FlowStates.PROFILE_DISCOUNT_PROFESSION);
      assert.match(result.response, /Profession & Service/);
    });

    await t.test('Selects actual discount (e.g. discount_1 BPL) from Economic sub-menu', async () => {
      consultationManager.updateSession(chatId, { flowState: FlowStates.PROFILE_DISCOUNT_ECONOMIC });
      
      const result = await conversationFlow.createFlowHandler(chatId, 'discount_1');
      assert.strictEqual(result.nextState, FlowStates.PROFILE_DISCOUNT_DOCUMENTS);
      assert.match(result.response, /upload eligibility documents/i);
      
      const session = consultationManager.getSession(chatId);
      assert.strictEqual(session.patientProfile.discountCategory, 'bpl_ews');
      assert.strictEqual(session.patientProfile.discountVerificationStatus, 'pending');
    });

    await t.test('Primary Menu - Option 4 (No Discount) skips document upload', async () => {
      consultationManager.updateSession(chatId, { flowState: FlowStates.PROFILE_DISCOUNT_CATEGORY });
      
      const result = await conversationFlow.createFlowHandler(chatId, '4');
      assert.strictEqual(result.nextState, FlowStates.BILLING);
      
      const session = consultationManager.getSession(chatId);
      assert.strictEqual(session.patientProfile.discountCategory, 'none');
      assert.strictEqual(session.patientProfile.discountVerificationStatus, 'not_applied');
    });
  });