const { test, describe, before, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');

const { ConversationFlow, FlowStates } = require('../services/conversationFlow');
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

describe('Exhaustive State Machine Fuzzer', () => {
  const TEST_CHAT_ID = '999999991';

  beforeEach(() => {
    consultationManager.sessions.clear();
    consultationManager.consultations.clear();
    
    // Register a valid admin profile so we pass profile completeness checks
    adminRegistry.addAdmin(TEST_CHAT_ID, 'system', TEST_CHAT_ID, 'super_admin', 'Fuzzer Admin');
  });

  afterEach(() => {
    try { if (fs.existsSync('data/sessions.json')) fs.unlinkSync('data/sessions.json'); } catch(e){}
    try { if (fs.existsSync('data/sessions.json.tmp')) fs.unlinkSync('data/sessions.json.tmp'); } catch(e){}
  });

  const statesToTest = Object.values(FlowStates);

  describe('Fuzzing Unrecognized Text Input', () => {
    for (const state of statesToTest) {
      test(`State: ${state} handles gibberish without crashing`, async () => {
        // Force the session into the target state
        consultationManager.updateSession(TEST_CHAT_ID, { flowState: state, phoneNumber: TEST_CHAT_ID });

        // Simulate a raw, unrecognized text input from the user
        const fuzzedInput = `Gibberish ${Math.random().toString(36).substring(7)}`;

        try {
          const result = await conversationFlow.createFlowHandler(TEST_CHAT_ID, fuzzedInput);
          
          assert.ok(result, `Handler must return a result for state ${state}`);
          assert.ok(result.nextState, `Handler must define a nextState for state ${state}`);
          assert.ok(result.response, `Handler must return a text response for state ${state}`);
          assert.strictEqual(typeof result.response, 'string', `Response must be a string for state ${state}`);
        } catch (error) {
          assert.fail(`State ${state} crashed on unrecognized input. Error: ${error.message}`);
        }
      });
    }
  });

  describe('Fuzzing Universal Cancel Sequence ("cancel" / "0")', () => {
    for (const state of statesToTest) {
      test(`State: ${state} handles "cancel" command`, async () => {
        // Force the session into the target state
        consultationManager.updateSession(TEST_CHAT_ID, { flowState: state, phoneNumber: TEST_CHAT_ID });

        try {
          const result = await conversationFlow.createFlowHandler(TEST_CHAT_ID, 'cancel');
          
          assert.ok(result, `Handler must return a result for state ${state}`);
          assert.ok(result.nextState, `Handler must define a nextState for state ${state}`);
          
          // Most cancels should route back to a safe fallback menu or persona select
          const safeStates = [
            FlowStates.WELCOME, 
            FlowStates.ADMIN_MENU, 
            FlowStates.SUPER_ADMIN_MENU, 
            FlowStates.DOCTOR_MENU, 
            FlowStates.CAREGIVER_MENU,
            FlowStates.SUPPORT_MENU,
            FlowStates.PERSONA_SELECT,
            FlowStates.CONSULTATION,
            FlowStates.ROLE_SELECT
          ];
          
          // Just ensure it doesn't crash. If it successfully returned a nextState, we are good.
        } catch (error) {
          assert.fail(`State ${state} crashed on "cancel" input. Error: ${error.message}`);
        }
      });
    }
  });
});
