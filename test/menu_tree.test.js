const { test } = require('node:test');
const assert = require('node:assert');
const menuTree = require('../services/menuTree');
const { renderKeyboard, isNodePending } = require('../services/menuTreeRenderer');

// Unit tests for the declarative menu tree itself - the single source of
// truth for every role's cascading badge state (see services/menuTree.js,
// services/menuFacts.js, services/menuTreeRenderer.js). Previously each
// menu's badge logic was hand-written and independently duplicated across
// telegramKeyboards.js, conversationFlow.js's InteractiveMenus text twins,
// and multiple call sites in telegramBot.js - these tests exercise the
// tree/renderer directly, with no service mocking needed, since facts are
// just plain objects.

function findBtn(kb, cb) {
  return kb.reply_markup.inline_keyboard.flat().find(b => b.callback_data === cb);
}

const cleanAdminFacts = () => ({
  pendingConsultations: 0, activeConsultations: 0,
  isAdminProfileComplete: true, adminMissingFields: [],
  hasPendingPayments: false, hasPendingDiscounts: false,
  pendingDoctorRoleRequests: 0, pendingCaregiverRoleRequests: 0, pendingSupportRoleRequests: 0,
  pendingDoctorInvites: 0, isSuperAdmin: true
});

test('menu tree: bottom-up cascade - a deeply nested pending leaf flags every ancestor', () => {
  const facts = { ...cleanAdminFacts(), pendingDoctorRoleRequests: 1 };
  assert.strictEqual(isNodePending(menuTree.adminRoot, facts), true, 'root must cascade up from a leaf 3 levels down');
  assert.strictEqual(isNodePending(menuTree.adminSystemMenu, facts), true);
  assert.strictEqual(isNodePending(menuTree.adminRoleApprovals, facts), true);
});

test('menu tree: priority group suppresses lower-priority siblings at the SAME level only', () => {
  const facts = { ...cleanAdminFacts(), hasPendingDiscounts: true, pendingDoctorRoleRequests: 1 };
  const root = renderKeyboard(menuTree.adminRoot, facts);
  assert.ok(findBtn(root, 'menu_finances').text.includes('🔴'), 'Finances outranks System per DESIGN_CASCADING_INDICATORS.md priority order');
  assert.ok(!findBtn(root, 'menu_system').text.includes('🔴'), 'System must be suppressed at root while Finances is pending');

  // But drilling into System shows ITS real state, unaffected by the
  // suppression happening at its parent's display layer.
  const system = renderKeyboard(menuTree.adminSystemMenu, facts);
  assert.ok(findBtn(system, 'role_approvals').text.includes('🔴'), 'suppression must not leak into the child\'s own screen');
});

test('menu tree: siblings without a priority group are fully independent', () => {
  const facts = { ...cleanAdminFacts(), pendingDoctorRoleRequests: 1, pendingCaregiverRoleRequests: 1 };
  const kb = renderKeyboard(menuTree.adminRoleApprovals, facts);
  assert.ok(findBtn(kb, 'approve_doctor').text.includes('🔴'));
  assert.ok(findBtn(kb, 'approve_caregiver').text.includes('🔴'), 'both must show independently - no artificial single-winner here');
  assert.ok(!findBtn(kb, 'approve_support').text.includes('🔴'));
});

test('menu tree: Manage Admins only visible for super admins', () => {
  const kb = renderKeyboard(menuTree.adminSystemMenu, { ...cleanAdminFacts(), isSuperAdmin: false });
  assert.strictEqual(findBtn(kb, 'manage_admins'), undefined, 'must not appear for a plain admin');
  const kbSuper = renderKeyboard(menuTree.adminSystemMenu, { ...cleanAdminFacts(), isSuperAdmin: true });
  assert.ok(findBtn(kbSuper, 'manage_admins'), 'must appear for a super admin');
});

test('menu tree: patient "My Consultations" is informational-only, never red', () => {
  const facts = { isProfileComplete: false, hasPendingConsultation: true, hasActiveConsultation: false, hasOtherRoles: false, hasMissingProfileFields: true };
  const kb = renderKeyboard(menuTree.patientRoot, facts);
  const consultationsBtn = findBtn(kb, 'consultation');
  assert.ok(consultationsBtn.text.includes('🟢'), 'green activity indicator for a pending consultation');
  assert.ok(!consultationsBtn.text.includes('🔴'), 'must never turn red even though the profile is incomplete - that is Profile & Roles\' job');
  assert.ok(findBtn(kb, 'profile').text.includes('🔴'), 'Profile & Roles carries the actionable red state instead');
});
