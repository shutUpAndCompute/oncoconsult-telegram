const { test } = require('node:test');
const assert = require('node:assert');
const TelegramAdapter = require('../src/servers/telegramBot');
const { FlowStates } = require('../services/conversationFlow');
const ConsultationManager = require('../services/consultationManager');
const PaymentService = require('../services/paymentService');
const adminRegistry = require('../services/adminRegistry');

// Regression test for the bug where typing a digit instead of tapping an
// inline button - while sitting in ADMIN_MENU/SUPER_ADMIN_MENU/DOCTOR_MENU/
// SUPPORT_MENU - sent the reply with NO reply_markup at all, so every
// button (and every red-dot indicator on it) vanished for the rest of the
// session. Every prior test exercised conversationFlow.js directly and
// never went through src/servers/telegramBot.js's actual message routing,
// so this class of bug was invisible to the existing suite regardless of
// how many times the indicator logic itself was rewritten.

test('sendTypedNavigationReply always attaches a live keyboard (not undefined)', async () => {
  const adapter = new TelegramAdapter();
  const sent = [];
  adapter.bot = {
    sendMessage: async (chatId, text, options) => {
      sent.push({ chatId, text, options });
      return { message_id: 1 };
    }
  };

  const consultationManager = new ConsultationManager();
  const chatId = '919999900001';
  consultationManager.updateSession(chatId, { flowState: FlowStates.ADMIN_MENU });

  await adapter.sendTypedNavigationReply(chatId, {
    nextState: FlowStates.ADMIN_FINANCES_MENU,
    response: 'placeholder text with 1️⃣ and 2️⃣ digits in it'
  });

  assert.strictEqual(sent.length, 1);
  assert.ok(sent[0].options.reply_markup, 'reply_markup must be attached, not undefined - this is exactly what was missing before the fix');
  assert.ok(Array.isArray(sent[0].options.reply_markup.inline_keyboard), 'reply_markup must be a real inline keyboard');
  assert.ok(sent[0].options.reply_markup.inline_keyboard.length > 0, 'keyboard must have buttons');
});

test('buildKeyboardForState(ADMIN_MENU) reflects live pending discount/payment state', async () => {
  const adapter = new TelegramAdapter();
  const consultationManager = new ConsultationManager();
  const paymentService = new PaymentService();

  const adminChatId = '919999900002';
  adminRegistry.addAdmin(adminChatId, adminChatId, adminChatId, 'admin', 'Test Admin');
  process.env.ADMIN_PHONES = process.env.ADMIN_PHONES ? `${process.env.ADMIN_PHONES},${adminChatId}` : adminChatId;

  // No pending anything yet - Finances button should be plain.
  let keyboard = adapter.buildKeyboardForState(adminChatId, FlowStates.ADMIN_MENU);
  let financesButton = keyboard.reply_markup.inline_keyboard.flat().find(b => b.callback_data === 'menu_finances');
  assert.ok(financesButton, 'Finances button must exist');
  assert.ok(!financesButton.text.includes('🔴'), 'Finances should not be flagged with no pending payments/discounts');

  // Create a patient with a pending discount request.
  const patientPhone = '919999900003';
  consultationManager.updateSession(patientPhone, {
    patientProfile: { discountCategory: 'bpl_ews', discountVerificationStatus: 'pending' }
  });

  keyboard = adapter.buildKeyboardForState(adminChatId, FlowStates.ADMIN_MENU);
  financesButton = keyboard.reply_markup.inline_keyboard.flat().find(b => b.callback_data === 'menu_finances');
  assert.ok(financesButton.text.includes('🔴'), 'Finances must be flagged once a discount verification is pending - this is the exact indicator that was silently broken by the missing () on .values');
});

test('buildKeyboardForState covers PERSONA_SELECT (previously had no case at all)', async () => {
  const adapter = new TelegramAdapter();
  const chatId = '919999900004';
  const keyboard = adapter.buildKeyboardForState(chatId, FlowStates.PERSONA_SELECT);
  assert.ok(keyboard, 'PERSONA_SELECT must produce a keyboard - tapping "Switch Role" used to render zero buttons');
  assert.ok(Array.isArray(keyboard.reply_markup.inline_keyboard));
  assert.ok(keyboard.reply_markup.inline_keyboard.length > 0);
});

test('buildKeyboardForState(ADMIN_PROFILE_EDIT) flags the specific missing field', async () => {
  const adapter = new TelegramAdapter();
  const adminChatId = '919999900005';
  adminRegistry.addAdmin(adminChatId, adminChatId, adminChatId, 'admin', null); // name missing, phone present

  const keyboard = adapter.buildKeyboardForState(adminChatId, FlowStates.ADMIN_PROFILE_EDIT);
  const nameBtn = keyboard.reply_markup.inline_keyboard.flat().find(b => b.callback_data === 'edit_name');
  const phoneBtn = keyboard.reply_markup.inline_keyboard.flat().find(b => b.callback_data === 'edit_phone');
  assert.ok(nameBtn.text.includes('🔴'), 'Edit Name must be flagged - name is missing (previously buildAdminProfileEdit() was called with no argument, so this could never show)');
  assert.ok(!phoneBtn.text.includes('🔴'), 'Edit Phone must not be flagged - phone is present');
});
