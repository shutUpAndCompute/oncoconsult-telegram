// Generic recursive renderer for the declarative menu trees in menuTree.js.
// This is the ONLY place that turns a tree node into red-dot/green-dot
// badge state or a Telegram keyboard. Every menu in the app (admin,
// super-admin, doctor, patient, caregiver) is rendered through these same
// four functions - there is no per-menu badge-computation code anywhere
// else. A node's "facts" object (see menuFacts.js) is the single source of
// truth it reads from; nothing here ever touches a service directly.

// True if this node itself needs attention, OR any descendant does -
// exactly the "bottom-up cascade" the menu tree exists to guarantee.
// Deliberately NOT priority-limited to one winner: every sibling that
// independently has a pending descendant gets its own dot, so a submenu's
// own badge state is never suppressed by an unrelated sibling being pending
// too (the previous ad-hoc "only one indicator wins" logic could hide a
// second, unrelated pending item entirely).
function isNodePending(node, facts) {
  if (typeof node.isPending === 'function') {
    return !!node.isPending(facts);
  }
  if (node.children?.length) {
    return node.children.some(child => isNodePending(child, facts));
  }
  return false;
}

// Green "in progress, no action needed" flag - separate concept from red.
// Only cascades up like isPending does; a node with an explicit
// hasActivity() always wins over inherited children state.
function nodeHasActivity(node, facts) {
  if (typeof node.hasActivity === 'function') {
    return !!node.hasActivity(facts);
  }
  if (node.children?.length) {
    return node.children.some(child => nodeHasActivity(child, facts));
  }
  return false;
}

function visibleChildren(node, facts) {
  return (node.children || []).filter(child => !child.visible || child.visible(facts));
}

// A parent may declare `priorityOrder: [childId, ...]` to say "when
// multiple of these siblings are independently pending, only show the dot
// on the highest-priority one" (e.g. Finances outranks Consultations on the
// admin root, per DESIGN_CASCADING_INDICATORS.md's documented priority
// order - this is a deliberate, pre-existing product decision, not
// something the tree model should silently drop just because bottom-up OR
// is the default elsewhere). This ONLY affects which sibling is drawn red
// at THIS level - it never changes what a child's own descendants show
// when you drill into it, since isNodePending is still computed for real
// and unaffected by suppression at an ancestor's display layer.
function priorityWinnerId(node, facts) {
  if (!node.priorityOrder) return undefined;
  for (const id of node.priorityOrder) {
    const child = node.children.find(c => c.id === id);
    if (child && isNodePending(child, facts)) return id;
  }
  return null; // priority group defined, but nothing in it is pending
}

const DIGIT_EMOJI = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];

function renderButtonLabel(child, digit, facts, winnerId) {
  const baseLabel = typeof child.label === 'function' ? child.label(facts) : child.label;
  const pending = winnerId !== undefined ? child.id === winnerId : isNodePending(child, facts);
  const active = !pending && nodeHasActivity(child, facts);
  const badge = pending ? '🔴 ' : (active ? '🟢 ' : '');
  return `${badge}${DIGIT_EMOJI[digit] || `${digit}️⃣`} ${baseLabel}`;
}

// Builds a Telegram reply_markup.inline_keyboard for `node`'s own screen -
// one row per visible child, in declaration order, numbered 1.. in order
// except nodes with an explicit fixed `digit` (used for "0️⃣ Back"/"Cancel"
// buttons, which always keep digit 0 regardless of list position).
function renderKeyboard(node, facts) {
  const children = visibleChildren(node, facts);
  const winnerId = priorityWinnerId(node, facts);
  let autoDigit = 1;
  const buttons = children.map(child => {
    const digit = child.digit ?? autoDigit++;
    return [{ text: renderButtonLabel(child, digit, facts, winnerId), callback_data: child.callbackData }];
  });
  return { reply_markup: { inline_keyboard: buttons } };
}

// Text-only equivalent (for the non-keyboard/dual-support code paths in
// conversationFlow.js's InteractiveMenus) - same badge computation, same
// node tree, so the text list and the buttons can never show different
// indicator state for the same underlying data.
function renderMenuText(node, facts, { title, footer } = {}) {
  const children = visibleChildren(node, facts);
  const winnerId = priorityWinnerId(node, facts);
  let autoDigit = 1;
  const lines = children.map(child => {
    const digit = child.digit ?? autoDigit++;
    return renderButtonLabel(child, digit, facts, winnerId);
  });
  const parts = [];
  if (title) parts.push(title, '');
  parts.push(...lines);
  if (footer) parts.push('', footer);
  return parts.join('\n');
}

module.exports = { isNodePending, nodeHasActivity, renderKeyboard, renderMenuText, visibleChildren };
