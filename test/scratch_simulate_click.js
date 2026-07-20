const assert = require('node:assert');
const TelegramAdapter = require('../src/servers/telegramBot');
const consultationManager = require('../services/consultationManager');
const { FlowStates } = require('../services/conversationFlow');

async function runSimulation() {
  const server = new TelegramAdapter();
  
  // Mock bot methods
  server.bot = {
    on: () => {},
    onText: () => {},
    answerCallbackQuery: async () => {},
    editMessageText: async (text, options) => {
      server.lastEdit = { text, options };
    },
    sendMessage: async () => {},
    startPolling: async () => {},
    setMyCommands: async () => {}
  };
  
  // Fake the initialization to bind the events but we capture the callback handler directly
  let callbackHandler;
  server.bot.on = (event, handler) => {
    if (event === 'callback_query') callbackHandler = handler;
  };
  
  await server.initialize('FAKE_TOKEN');

  const chatId = '9999999999';
  
  // 1. Set initial state to WELCOME
  consultationManager.updateSession(chatId, { flowState: FlowStates.WELCOME, patientProfile: { platformTermsAccepted: true } });
  
  // 2. Simulate clicking "Profile & Roles" (callback_data: 'profile')
  const query = {
    id: 'query1',
    data: 'profile',
    message: { chat: { id: chatId }, message_id: 100 }
  };
  
  await callbackHandler(query);
  
  // 3. Assertions
  const session = consultationManager.getSession(chatId);
  
  console.log('--- TEST RESULTS ---');
  console.log('1. Session State Updated?', session.flowState === FlowStates.PROFILE_VIEW ? '✅ YES (Now PROFILE_VIEW)' : `❌ NO (Still ${session.flowState})`);
  
  console.log('2. editMessageText called?', server.lastEdit ? '✅ YES' : '❌ NO');
  
  console.log('3. Text Menus Stripped?');
  const hasOldText = server.lastEdit.text.includes('1️⃣') || server.lastEdit.text.toLowerCase().includes('reply with number');
  console.log(hasOldText ? '❌ NO (Still contains emojis/prompts)' : '✅ YES (Clean text)');
  console.log('Cleaned Text output:\n', server.lastEdit.text);
  
  console.log('4. New Keyboard Attached?');
  const hasKeyboard = server.lastEdit.options.reply_markup && server.lastEdit.options.reply_markup.inline_keyboard;
  console.log(hasKeyboard ? '✅ YES' : '❌ NO');
  if (hasKeyboard) {
    console.log('Buttons:', server.lastEdit.options.reply_markup.inline_keyboard.map(row => row.map(btn => btn.text)));
  }
}

runSimulation().catch(console.error);
