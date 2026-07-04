const { normalizePhone, normalizePhoneStrict } = require('../utils/phone');
const { test } = require('node:test');
const assert = require('node:assert');

test('normalizePhone removes non-digits and +91 prefix', () => {
  assert.strictEqual(normalizePhone('+919876543210'), '9876543210');
  assert.strictEqual(normalizePhone('919876543210'), '9876543210');
  assert.strictEqual(normalizePhone('9876543210'), '9876543210');
});

test('normalizePhone handles null/empty', () => {
  assert.strictEqual(normalizePhone(null), '');
  assert.strictEqual(normalizePhone(''), '');
  assert.strictEqual(normalizePhone(undefined), '');
});

test('normalizePhoneStrict removes + and spaces', () => {
  assert.strictEqual(normalizePhoneStrict('+91 9876 543210'), '9876543210');
  assert.strictEqual(normalizePhoneStrict('+919876543210'), '9876543210');
  assert.strictEqual(normalizePhoneStrict('9876543210'), '9876543210');
});