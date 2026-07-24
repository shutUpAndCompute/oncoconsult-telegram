# Navigation Standard

**Status: current, as of 2026-07-24.** This supersedes `NAVIGATION_AUDIT_REPORT.md` (2026-07-15),
which predates the admin menu's Consultations/Finances/System submenu split and is now inaccurate
in places (e.g. its Phase 6 table says Set Fee/Verify Payment/Verify Discount should say "Back to
Admin Menu" - true when it was written, since those were flat children of Admin Menu at the time;
false now that they're children of Finances Menu instead). Kept for history, not as a reference.

The source of truth for structure is `services/menuTree.js`. Everything below is a rule the tree (and
every handler that returns a `nextState`) is expected to satisfy - not aspirational, checkable.

---

## 1. The digit-0 convention

**Digit `0` means exactly one of two things, never anything else:**

- On a **role's home/root menu** (Admin, Super Admin, Patient, Caregiver, Doctor, Support): `0` = **Switch Role**.
  Hidden when the user holds only one approved role (`visible: f => f.hasOtherRoles` in the tree).
- On **every other screen** (any submenu, any input prompt): `0` = **Back to the immediate structural
  parent** - the literal parent node in `menuTree.js`, not a grandparent, not root, not a different
  role's menu.

A submenu never gets its own Switch Role shortcut. To switch role from three levels deep, back out
level by level (`0`, `0`, `0`) to the role's home menu, then Switch Role. This was violated at least
once (Consultation menu's old digit `4` jumped straight to Switch Role, skipping its own "Back to
Menu"); it shouldn't happen again.

There is exactly one exception in the codebase to "0 always means the same thing," and it's a
different mechanism entirely, not a violation: **`/menu` (the Telegram command) always works, from
any state, for any role**, and always jumps straight to that role's home screen
(`TelegramAdapter.sendRoleHomeMenu`). This is matched by `bot.onText(/\/menu/, ...)`, which Telegram
dispatches independently of whatever `flowState` the session is in - it is the app's actual "go
home" shortcut, and digit `0` (step-by-step back) is deliberately not required to duplicate it.

## 2. Back buttons must name their real destination

A "0️⃣ Back to X" label is a promise. `X` must be the screen `0` actually goes to. This was broken
multiple times before this standard existed (a "Back to Admin Menu" button that actually went to
Persona Select; a "Back to Profile" button on Edit Admin Profile that actually returned to Admin
Menu; several Finances/Consultations-submenu inputs still labeled "Back to Admin Menu" after those
screens moved under a submenu). Any time a submenu's parent changes, its children's back-button
labels must be checked, not just their `nextState`.

## 3. After any set/edit action: confirm, then return to the immediate parent

Every handler that mutates something (a field, a role, a fee, a verification status) must:

1. Show what changed (`✅ Name updated to "..."`, `✅ Fee set to ₹1500 for ...`) - not just move on
   silently.
2. Return to the screen whose button launched the action - not root, not a sibling screen, not a
   different role's tree - re-rendered with live, freshly-recomputed facts (never a stale count
   passed in from before the change).
3. The one deliberate exception: a value's *first* completion of a multi-field requirement (e.g. an
   admin profile going from incomplete to complete) may show a one-time "what next?" screen
   (`ADMIN_PROFILE_COMPLETE_OPTIONS`) instead of silently returning - but only on that transition,
   never on a plain cancel, and never with a message claiming completion when the thing being
   described isn't actually complete.

## 4. One rendering path per menu - text and buttons come from the same tree

Every menu's keyboard (`telegramKeyboards.js`) and its text-only twin (`InteractiveMenus.*` in
`conversationFlow.js`) must render from the same `menuTree.js` node with the same facts. Neither may
hand-compute its own badge logic, its own digit numbering, or its own "what's pending" condition
independently - every prior bug where text and buttons disagreed (different button flagged red,
different digit meaning "back," a badge condition that doesn't match what the tree actually checks)
came from exactly this kind of independent duplication.

## 5. Facts are computed fresh, every render, never threaded as stale defaulted parameters

A function whose "is this complete" parameter defaults to `true` and is never actually passed by any
caller is a bug waiting to be found, not a convenience - it was found here (`getWelcomeMenu`'s
`profileComplete` parameter defaulted to `true`; all ~15 call sites omitted it, so the single
highest-traffic patient screen's completeness indicator could never fire, for any patient, ever).
Menu-rendering functions should take a `phoneNumber`/session and compute what they need internally
(via `services/menuFacts.js`), not accept precomputed booleans that can drift out of sync with reality.

## 6. Cross-role consistency

The same rule applies identically to Admin, Super Admin, Patient, Caregiver, Doctor, and Support -
there is no role-specific exception to any of the above. Concretely, as of this document: every
role's home menu has Switch Role at digit `0` (previously Patient used digit `3`, and Doctor's
Switch Role existed only in text/typed-input handling with no actual button in the tree at all - a
doctor tapping their way through the app had no way to switch role by button, only by typing "0"
blind).

---

## Where this is enforced

- **Structure & digits**: `services/menuTree.js` - the only place node hierarchy, callback data, and
  digit assignment are declared.
- **Rendering**: `services/menuTreeRenderer.js` - the only code that turns a `(node, facts)` pair
  into a keyboard or text list.
- **Facts**: `services/menuFacts.js` - the only code that reads live service state to answer "is X
  pending/complete."
- **Routing**: each `handle*Selection`/`handle*Input` function in `services/conversationFlow.js`
  returns `{nextState, response}` - `nextState` must match the tree's actual parent/child
  relationship for whatever screen the action was launched from.
- **Callback translation**: `services/payloadMap.js` - must have an entry for every button emitted
  by a tree node whose `callbackData` isn't already a bare digit string.

See `TOFIXGAPS.md` for the specific violations found and fixed against this standard, dated
2026-07-24.
