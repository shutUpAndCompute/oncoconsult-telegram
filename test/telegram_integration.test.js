const assert = require('node:assert');
const { test } = require('node:test');
const TelegramAdapter = require('../src/servers/telegramBot');

test('Outer Layer: UI Cleanup Validation (Text stripping)', () => {
  const adapter = new TelegramAdapter();
  
  const rawText = `🩺 *Oncology Consultation*

1️⃣ My Consultations
2️⃣ 👤 Profile & Roles
3️⃣ Switch Role

Reply with number`;

  // Test with keyboard present
  const cleanedWithKeyboard = adapter.cleanTextForKeyboard(rawText, true);
  assert.ok(!cleanedWithKeyboard.includes('1️⃣'), 'Text menu emoji bullets should be stripped');
  assert.ok(!cleanedWithKeyboard.toLowerCase().includes('reply with number'), 'Reply prompt should be stripped');
  
  // Test without keyboard present (should return original)
  const withoutKeyboard = adapter.cleanTextForKeyboard(rawText, false);
  assert.ok(withoutKeyboard.includes('1️⃣'), 'Should preserve menu if no keyboard attached');
  assert.ok(withoutKeyboard.toLowerCase().includes('reply with number'), 'Should preserve prompt if no keyboard attached');
});
