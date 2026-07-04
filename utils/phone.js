function normalizePhone(phone) {
  if (!phone) return '';
  let normalized = String(phone).replace(/\D/g, '');
  if (normalized.startsWith('91') && normalized.length > 10) {
    normalized = normalized.substring(2);
  }
  return normalized;
}

function normalizePhoneStrict(phone) {
  if (!phone) return phone;
  let normalized = String(phone).replace('+', '').replace(/\s+/g, '');
  if (normalized.startsWith('91') && normalized.length > 10) {
    normalized = normalized.substring(2);
  }
  return normalized;
}

module.exports = { normalizePhone, normalizePhoneStrict };