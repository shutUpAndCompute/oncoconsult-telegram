# To-Fix Gaps — Menu / Navigation / State / Persistence Audit

## 2026-07-24: universal navigation standard defined and enforced

Trigger: "There should be universal navigation standards, up/down/back/forth, universal back to
main menu etc for all roles as per ui ux best practices." Wrote `NAVIGATION_STANDARD.md` as the
concrete, checkable standard (digit-0 convention, back-buttons-name-their-destination, confirm+
return-to-parent, one rendering path per menu, facts computed fresh not defaulted, cross-role
consistency) and audited every role's menu tree against it. It explicitly supersedes
`NAVIGATION_AUDIT_REPORT.md` (2026-07-15), which predates the admin submenu split and is stale in
places (e.g. it documents Set Fee/Verify Payment's back button as "Admin Menu," correct when those
were flat children of Admin Menu, wrong now that they're children of Finances Menu).

Found and fixed, all live/real bugs, not just documentation drift:

1. **Patient's Switch Role was digit `3`**, the only role that broke the "Switch Role always sits at
   0" convention every other role (Admin, Caregiver, and now Doctor) follows. Moved to `0`
   (`menuTree.js`'s `patientRoot`); `1`/`2` (My Consultations/Profile & Roles) unaffected.

2. **Doctor's menu tree had no Switch Role node at all** - the text screen said "0️⃣ Switch Role" and
   typing "0" worked (handled directly in `handleDoctorMenuSelection`), but the real tap-able
   keyboard had no such button; a doctor navigating by tapping had no way to switch role. Added the
   node to `doctorRoot`, wired `hasOtherRoles` into `computeDoctorFacts`/`buildKeyboardForState`/
   `sendRoleHomeMenu`/`InteractiveMenus.doctorMenu` (previously not computed for doctors at all;
   `buildDoctorMenu`/`InteractiveMenus.doctorMenu` default it to `true` for the several internal
   call sites that don't have it handy, matching the always-shown behavior that already existed).

3. **The Consultation menu's "4️⃣ Back to Menu" didn't go back to the menu.** It went to Switch Role
   (`PERSONA_SELECT`) - both the wrong digit (submenus use `0`) and, independent of the digit, simply
   not what a button labeled "Back to Menu" should do. Live, user-facing, on a screen every patient
   with an active or pending consultation sees. Fixed the tree (digit `4`→`0`), `payloadMap.js`, and
   `handleConsultationMenuSelection` together so it now actually returns to `WELCOME`.

4. **`getWelcomeMenu`'s `profileComplete` parameter defaulted to `true`, and every one of its ~15
   call sites omitted it.** This is the single highest-traffic patient screen (shown by `/start`,
   `/menu`, `/resume`, `/clear`, idle-recovery, and as the fallback after most WELCOME-state actions)
   - its "Profile & Roles" 🔴 indicator was structurally incapable of ever firing, for any patient,
   regardless of actual profile completeness, for as long as this parameter has existed. Same bug,
   independently, in `getMessageOptions`'s `WELCOME`/`CONSULTATION` cases (a hardcoded
   `profileComplete = true` constant at the top of the function, with a comment rationalizing it as
   intentional). Fixed both to compute real completeness from the live session every call, matching
   how every other role's home-menu renderer already worked.

5. **`InteractiveMenus.main` (WELCOME) and `InteractiveMenus.consultation` (My Consultations) were
   never migrated onto the tree** in the earlier architectural-rewrite pass - both still hand-computed
   badges from a `hasPendingPayment` boolean that the tree/live buttons have *never* used for either
   screen (My Consultations is deliberately informational-only; Start Consultation/Payment Status are
   both driven by profile completeness, not payment state). Migrated both onto
   `renderMenuText(menuTree.patientRoot/patientConsultationMenu, ...)`, closing the last two patient-
   facing text/button divergence gaps from that pass.

6. **`adminProfileEdit`'s back button said "Back to Profile"** - stale since an earlier fix in this
   same file changed its actual destination to the admin's main menu. Relabeled to match.

Verified live (keyboard-rendering scripts confirming Patient/Doctor Switch Role placement and
visibility gating, a WELCOME-screen simulation with a deliberately incomplete profile showing the
🔴 that was previously impossible, and a Consultation-menu "0" simulation confirming it now reaches
WELCOME) + full suite, 271/271 - two pre-existing tests that encoded the old digit-4/no-completeness-
check behavior (`comprehensive_audit.test.js`, `navigation.test.js`) were updated to assert the
corrected behavior.

## 2026-07-24: same sweep, extended to patient/caregiver/doctor/support

Explicit follow-up to the admin-side sweep below: "is the same class of bug fixed for every role
across the whole lifecycle, not just admin?" Answer required actually re-walking every non-admin
`FlowState`'s handler (~30 of them: onboarding, patient profile/roles, the consultation-request
wizard, discount eligibility wizard, withdrawal, caregiver auth/link/menu, doctor menu/profile/
patients/message-admin, support menu) against its structural parent in `menuTree.js`, not assuming
parity from the admin fix.

**Result: the admin-specific bug (wrong destination role's menu tree, false completion messages,
skipped-parent-with-no-consistency) does not recur elsewhere** - patient profile edit, doctor
profile edit, "Remove Role", "Apply for Role", the entire discount-eligibility wizard
(Category → Economic/Profession/Social → Documents), caregiver patient-link, and every doctor-menu
action already had correct confirm-and-return-to-real-parent behavior before this pass. These were
spot-verified, not just assumed, by reading each handler against the tree.

**One real, distinct bug found**: the "Start Consultation" wizard (Cancer Type → Report Upload →
Billing), reached exclusively via My Consultations → "Start New Consultation"
(`handleStartConsultation`), had every step's cancel/back go to `WELCOME` (the patient root),
skipping its actual immediate parent, `CONSULTATION` (My Consultations). This wasn't a deliberate
"abort the whole wizard" design either - `handleBillingSelection`'s own option `'2'` (Check Payment
Status) on the *same screen* already correctly returned to `CONSULTATION`, while option `'0'`
(Cancel) on that identical screen went to `WELCOME` - an internal inconsistency within one menu, not
a consistent policy. `handleWithdrawalRequest`'s "nothing to withdraw" fallback had the same
skipped-parent bug. Fixed all four (`handleCancerTypeSelection`, the `REPORT_UPLOAD` case in the
dispatcher, `handleBillingSelection`, `handleWithdrawalRequest`) to return to `CONSULTATION`;
relabeled Billing's "0️⃣ Main Menu" button/text to "0️⃣ Back to Consultations" (both
`telegramKeyboards.js`'s keyboard and `conversationFlow.js`'s text twin) since the label was already
inaccurate even before the fix - it said "Main Menu" while actually behaving like an abort-to-root,
neither of which matched the two other exits on the same screen.

Verified live (simulation script asserting each of the four now lands on `CONSULTATION`) + full
suite, 271/271, no regressions - none of the 271 pre-existing tests were asserting the old `WELCOME`
destination for any of these four, so nothing needed updating to match.

## 2026-07-24: universal post-action navigation — "confirm the change, return to the actual parent"

Trigger: a real transcript (`/start` → Edit Admin Profile → Edit Name → type a name) where the
result skipped past the screen the action was launched from. The question behind it: after any
set/edit action, anywhere, for any role, should (a) print what changed and (b) return to the exact
parent menu of the screen the action happened on - not some other screen, not the root menu, not a
different role's menu tree. Investigating that one case turned up the same defect at scale across
nearly every admin action handler, plus two bugs in the tree itself. Fixed all of it; verified live
(sim script + full suite, 271/271) rather than by inspection alone.

**Root cause, again**: `services/telegramKeyboards.js`'s keyboard builders were migrated onto
`menuTree.js` in the previous pass, but `conversationFlow.js`'s *text* twins for every submenu below
the root (Consultations/Finances/System/Role Approvals/Doctor Management/Manage Admins/Admin Profile
Edit/patient Profile & Roles/Doctor Menu) were never migrated - each still hand-computed its own
badge logic independently, the exact duplication pattern this whole document exists to eliminate.
Migrated all of them onto `renderMenuText(treeNode, facts, {title, footer})`. Concrete divergences
this caught, live, that unit tests never would (they asserted against the same hand-written text,
not against the tree):
- `adminProfileEdit`'s text used `else if` (only one of Edit Name/Edit Phone could ever show 🔴,
  even if both fields were missing) - the tree's real default is independent per-sibling dots.
- `doctorMenu`'s text put 🔴 on "Status" for any pending action; the tree (and the real keyboard,
  which was already tree-driven) puts 🔴 on "Message Admin" and 🟢 on "Status" - text and buttons
  disagreed on *which button* was flagged, not just on styling.
- Patient `profileMenu`'s text said "0️⃣ Back to **Profile**"; the tree's live button on the exact
  same screen has always said "Back to **Menu**" - visible divergence between the keyboard a button
  tap sees and the text a typed digit sees, on the single highest-traffic patient screen.

**The "Edit Admin Profile" bug chain** (`handleAdminProfileEditInput`, `conversationFlow.js`):
1. Stray literal `}` at the end of both the name- and phone-updated success strings (rendered
   verbatim to the user: `...${InteractiveMenus.profileMenu({})}}`).
2. Every branch - cancel from Edit Name, cancel from Edit Phone, and both success paths when the
   profile was still incomplete afterward - sent the admin to `PROFILE_VIEW`, the **patient**-shaped
   Profile & Roles tree (View Profile/Edit Profile/Apply for Role/My Roles/Remove Role), not back to
   "Edit Admin Profile" (the actual immediate parent of Edit Name/Edit Phone).
3. Every one of those same "still incomplete" branches displayed
   `InteractiveMenus.adminProfileCompleteOptions(role)`, whose text is literally "✅ *{role} Profile
   Complete!*" - shown specifically in the branch that fires when the profile is **not** complete.
   A cancel while incomplete showed a false completion banner.
4. The top-level `selection === '0'` check ran *before* the `session.flowState ===
   ADMIN_PROFILE_EDIT_NAME/_PHONE` checks, so cancelling out of either sub-prompt (typing "0", which
   the prompt itself instructs) was unreachable dead code - it fell through to the screen-level
   handler instead and jumped two levels up, to the admin root, not one level up to Edit Admin
   Profile.

Fixed: removed the typo; cancel now always returns to Edit Admin Profile (its real parent); the
one-time "Profile Complete!" wizard now only fires on the actual incomplete→complete transition
(tracked via a local `wasComplete` snapshot, not instance state - an instance field would leak
across concurrent users on this shared singleton); every success path prints `✅ {field} updated to
"{value}"` before the re-rendered parent; reordered the sub-state checks first. `2️⃣ Continue Editing`
on the (now-genuine) "Profile Complete!" screen was *also* routing to the patient `PROFILE_VIEW`
tree instead of back to Edit Admin Profile - same bug, different entry point; fixed the same way.

**The systemic version, once the pattern was visible**: swept every admin action handler that
commits a change. Nearly all of them returned `nextState: ADMIN_MENU` (the root) regardless of which
submenu the action was launched from:
- Verify Discount, Verify Payment, Set Fee (children of **Finances Menu**) → now return to
  `ADMIN_FINANCES_MENU` with the change confirmed and the finances submenu re-rendered live.
- Message Patient, Close Consultation, View Pending Requests, View Active Consultations, View All
  Patients (children of **Consultations Menu**) → now return to `ADMIN_CONSULTATIONS_MENU`.
- Add Admin / Remove Admin's "0 to return to menu" exit (children of **Manage Admins**, itself a
  child of **System Menu**) → now returns to `SUPER_ADMIN_MANAGE_ADMINS`, not the admin root; the
  bulk "enter another number" loop itself was correct and left alone.
- Every error-fallback path in Approve Doctor/Caregiver/Support, Register/Invite Doctor, Remove/
  Reject Doctor (when the underlying registry call unexpectedly failed) had the same
  root-instead-of-parent bug; fixed to match their success-path siblings.
- Added `getAdminFacts`/`getAdminFinancesMenuText`/`getAdminConsultationsMenuText`/
  `getAdminSystemMenuText` helpers so every one of the above recomputes live facts fresh from the
  same single `menuFacts.computeAdminFacts` call, instead of each handler either reconstructing the
  services bag inline or (previously) not recomputing anything at all.

**Two bugs in the tree itself** (`services/menuTree.js`), not just in how handlers used it: Role
Approvals and Doctor Management are children of **System & Roles Menu**
(`adminRoot → adminSystemMenu → {adminRoleApprovals, adminDoctorManagement, superAdminManageAdmins}`)
- but only `superAdminManageAdmins`'s back button correctly said "Back to System Menu". The other two
said "Back to Admin Menu" / `callbackData: 'admin_menu'`, both in the label *and* in
`payloadMap.js`'s actual routing table, and `handleAdminRoleApprovalsSelection`/
`handleAdminDoctorManagementSelection`'s own `'0'` cases matched that (wrong) destination - so this
wasn't just a label bug, tapping "0" for real skipped System & Roles Menu on the way back. Fixed the
tree, `payloadMap.js` (`admin_menu` → `menu_system` for these two states), and both handlers together
so button-tap and typed-digit stay in agreement.

**Also found and fixed while in this code**:
- `InteractiveMenus.adminDoctorManagement` (a function since the earlier tree migration, taking a
  `pendingDocs` argument) was referenced **without calling it** - `${InteractiveMenus.adminDoctorManagement}`
  - at 9 call sites across Reassign Doctor, Register Doctor, and Invite Doctor's guard/fallback
  branches. This stringifies the function's source code into the Telegram message instead of
  rendering the menu - a live, user-facing bug, not a hypothetical one. Fixed all 9.
- `adminSetFeeInput` was defined **twice** as a key in the same `InteractiveMenus` object literal;
  the second silently shadowed the first (valid but confusing JS, not an error) - deleted the dead
  first copy.
- `getCloseConsultationPrompt()` - a whole method, fully duplicating `InteractiveMenus.closeConsultationPrompt`'s
  text - was never called from anywhere. Deleted (zero-impact, matching the #27/#28 removal pattern).
- `services/menuFacts.js`'s `computeDoctorFacts` still had its own inline
  `d.telegramId === chatId || phone-strip === chatId` doctor lookup - the exact duplication pattern
  centralized into `doctorPersistence.findByChatId` in the previous pass, just missed because this
  file wasn't touched by that sweep. Fixed to call `findByChatId`.
- `telegramKeyboards.js`'s `buildProfileMenu` - a full second, hand-written implementation of the
  patient Profile & Roles keyboard, never imported or exported anywhere - deleted as dead code.
- Button labels for the "0️⃣ Back" buttons on Verify Payment/Verify Discount/Set Fee/Message Patient/
  Add Admin/Remove Admin input screens all said "Back to Admin Menu"/"Back to Super Admin Menu"
  regardless of actual destination; relabeled to match where they've always actually gone (their
  `callback_data` and `payloadMap.js` routing were already correct - button behavior didn't change,
  only the previously-misleading label text).

Verified live: a standalone script exercises Set Fee, Verify Payment, Verify Discount, Message
Patient, Role Approvals "0", Doctor Management "0", and the Add Admin bulk-loop exit, asserting each
lands on its real immediate parent - all pass. Full suite: 271/271, no regressions (2 pre-existing
test assertions in `test/navigation.test.js` were asserting the *old, buggy* destinations - e.g.
"Continue Editing → profile_view" - updated to assert the corrected behavior instead of reverting
the fix to match them).

## 2026-07-24: architectural rewrite — declarative menu tree

Every fix on this page up to today shared one root cause: there was no single place that computed
"is X pending" once. ~15 keyboard-builder functions each took positional booleans/counts as
arguments, every call site had to independently recompute those values from live services, and
every independent recomputation was a fresh chance to typo a field name, drop a `()`, leave a
`// TODO` stub, pass the wrong type, or just forget an argument — which is exactly how bugs #9,
#19, #21, and the finances/system-menu/role-approvals stubs found on 2026-07-24 all happened, one
at a time, despite the underlying *pattern* being identical every time.

Replaced with three new modules that are now the only place this logic lives:
- **`services/menuFacts.js`** — the only code in the app that reads live data from services.
  `computeAdminFacts`/`computePatientFacts`/`computeDoctorFacts`, one call per render.
- **`services/menuTree.js`** — declarative per-role node trees (admin/super-admin, patient,
  caregiver, doctor). Every leaf's `isPending(facts)`/`hasActivity(facts)` is a pure lookup on the
  facts object above — no service access, no duplication. Parents don't compute anything; they
  inherit bottom-up.
- **`services/menuTreeRenderer.js`** — one generic recursive `renderKeyboard(node, facts)` /
  `renderMenuText(node, facts)`, used by every role's every menu. `isNodePending` cascades "does
  this node or any descendant need attention" up automatically.

`src/servers/telegramBot.js`'s `buildKeyboardForState` (the single chokepoint added in the
previous pass) now looks the state up in the tree and renders it — no more per-state positional-arg
threading in that ~230-line switch. `telegramKeyboards.js`'s existing build* functions became thin
wrappers over the tree (facts constructed from their same positional args) purely so the existing
test suite and any other direct callers keep working unchanged — the wrappers are not where the
logic lives anymore. `conversationFlow.js`'s `InteractiveMenus.adminMenu`/`superAdminMenu` (the
text-only twins, previously an independent second implementation of the same priority math via a
now-deleted `adminIndicators.js`) render from the exact same tree node, so the text list and the
buttons structurally cannot disagree again. 271/271 tests passing (`test/menu_tree.test.js` is new,
exercising the tree/renderer directly with no service mocking needed since facts are plain objects).

**Two deliberate behavior changes**, both flagged before implementation:
1. Cascading is bottom-up OR by default now (any pending descendant flags every ancestor) rather
   than each menu hand-coding its own suppression logic. The one place the *product* genuinely
   wants only-the-highest-priority-item-shown (admin root: Finances > System > Profile >
   Consultations; Finances submenu: Discount > Payment, both per `DESIGN_CASCADING_INDICATORS.md`)
   is preserved via an explicit `priorityOrder` field on those two nodes — but this only suppresses
   the *sibling display* at that one level; drilling into a suppressed sibling still shows its own
   real state. Verified live: Finance+System both pending → root shows only Finance red, but System
   still shows real state on nested drill-in, resets when Finance resolves.
2. `buildConsultationMenu`'s "Check Payment Status" used ⚠️ while "Start New Consultation" used 🔴
   for the identical underlying condition (incomplete profile) — normalized to 🔴 for both, since
   the tree has no way to express "same fact, different color" and there was no reason for the
   difference beyond how the two lines happened to be hand-written originally.

## 2026-07-24 (verification pass): admin profile-completion cascade

Live-simulated the full cascade for an admin/super admin with an incomplete profile: top-level
"My Profile" 🔴 appears when the profile is incomplete and nothing higher-priority is pending,
correctly gets *suppressed* (not cleared - the underlying incompleteness is unchanged) when a
higher-priority Finance/System item is also pending, and correctly reappears once that higher item
is resolved. Confirmed via `services/adminRegistry.js`'s `isAdminProfileComplete`/
`getIncompleteProfileFields` feeding `computeAdminMenuIndicators` correctly.

Found one more instance of the same bug class while checking the deepest leaf: `buildKeyboardForState`'s
`ADMIN_PROFILE_EDIT` case called `telegramKeyboards.buildAdminProfileEdit()` with **no argument**,
so "Edit Name"/"Edit Phone" could never show which one was actually missing - carried over verbatim
from the pre-refactor switch fallback, which had the identical bug. Fixed by passing
`adminRegistry.getIncompleteProfileFields(chatId)` through, same as the accompanying text already
did. Added a regression test (`test/typed_navigation_keyboards.test.js`) asserting the specific
missing field is flagged. 266/266 passing.

## 2026-07-24: the actual reason indicators kept "not working" across every prior rewrite

Every fix in this document up to this point patched *what a keyboard should show*. None of them
could have mattered for a large fraction of real traffic, because of a bug one layer up: in
`src/servers/telegramBot.js`'s plain-text message handler (`bot.on('message')`), the branches that
handle a user **typing** a digit instead of **tapping** an inline button — while sitting in
`WELCOME`, `ADMIN_MENU`, `SUPER_ADMIN_MENU`, `DOCTOR_MENU`, or `SUPPORT_MENU` — called
`bot.sendMessage(chatId, flowResult.response, { parse_mode: 'Markdown' })` with **no `reply_markup`
key at all**. Telegram's `sendMessage` doesn't preserve or update the previous message's keyboard
when you omit `reply_markup` on a *new* message — it just doesn't attach one. So the next screen
had zero buttons, not stale or wrong ones. There was no second chance to reattach a keyboard later
either, because the next reply came from this exact same broken branch again.

This explains the "still not working after so many rewrites and testing" report precisely: **no
test in this repo ever exercised `src/servers/telegramBot.js`'s message routing.** Every existing
test called `services/conversationFlow.js` functions directly (`test/telegram_integration.test.js`
was 25 lines and only tested `cleanTextForKeyboard`, a pure string function). Rewriting the
indicator math inside `conversationFlow.js`/`telegramKeyboards.js` — which is what every prior pass
(including most of this document, before today) actually touched — could never have fixed this,
because the buttons those functions produce were never reaching the user on this path in the first
place. Anyone testing by *typing* into the bot (a very natural thing to do when debugging, faster
than tapping) would see this on effectively every screen.

**Fix**: consolidated the three independent copies of "which keyboard belongs to this FlowState"
(a `getKeyboard()` closure + a ~35-case `switch` fallback in the callback_query handler, plus a
shorter, differently-incomplete if/else chain in the message handler that didn't even cover
`ADMIN_FINANCES_MENU`/`ADMIN_SYSTEM_MENU`/`ADMIN_CONSULTATIONS_MENU`) into one method,
`TelegramAdapter.buildKeyboardForState(chatId, state)`, plus a `sendTypedNavigationReply(chatId,
flowResult)` helper that always calls it. Every typed-text branch now goes through
`sendTypedNavigationReply` instead of a bare `sendMessage`. Along the way this also fixed:
`PERSONA_SELECT` (tapping "Switch Role" via a **button** produced zero buttons on the resulting
screen too — no case existed for it in the old switch), and the `WELCOME`-state typed-text path
(the single highest-traffic branch of all, hit by every patient who types "1" instead of tapping).

Also found and fixed while tracing this, all in `conversationFlow.js`'s own response-generation
(masked in the button-tap path by the keyboard rebuild above, but shown verbatim - wrong - whenever
no keyboard was attached, i.e. every typed-text hit before today):
- `handleAdminMenuSelection`/`handleSuperAdminMenuSelection`'s `'menu_finances'` case had
  `const hasPendingPayments = false; // TODO: Implement pending payments logic` (and same for
  discounts) - a stub comment left in place, hardcoding the Finances indicator off unconditionally.
- The same two functions' `'menu_system'` case called `getPendingRequests('doctor')`, undercounting
  the System & Roles indicator by ignoring pending caregiver/support applications.
- `handleAdminFinancesMenuSelection`'s invalid-input fallback hardcoded `(false, false)`.
- `handleAdminSystemMenuSelection`'s Role-Approvals case, and `handleAdminRoleApprovalsSelection`/
  `getDoctorApplications`'s fallbacks, passed a bare pending-count *number* into
  `adminRoleApprovals()`, which expects a `{doctor, caregiver, support}` object - `number.doctor` is
  `undefined`, so every per-role indicator there was silently always off.

Added `test/typed_navigation_keyboards.test.js` - the first test in this repo that actually
instantiates `TelegramAdapter` and asserts `reply_markup` is present (not `undefined`) on the typed
navigation path, and that indicators reflect live data through it. This is the regression guard
that was missing; without it this exact bug class has no way to resurface undetected again.

## Status (updated 2026-07-23, same-day fix pass)

**All 31 of 31 fixed and verified** (`npm test` — 262/262 passing, no regressions).

**#27/#28 follow-up**: removing the vestigial `session.pendingPayment` field (#28) led to the same
discovery pattern as #22 — the one real (non-dead) reference to it, in `handleAdminSetFeeInput`,
was gating the *entire* Admin "Set Fee" feature on a field that's never set to anything but `null`/
`false`, so Set Fee always replied "No pending payment found," 100% of the time, for every admin.
Worse, even past that dead gate it called `paymentService.setFee(targetPhone, ...)` - `setFee`
looks up its `payments` Map by **transaction ID**, not phone number, so the fee would never have
been applied even if the gate passed. Rewrote it to look up the patient's actual pending
transaction in `paymentService.payments` (keyed correctly) instead. Verified end-to-end with a
standalone script: creates a fee-pending transaction, runs Set Fee through the real handler,
confirms `payment.amount`/`feePending`/`adminNote` all update correctly (previously: no-op, always
"not found"). `patientRegistry`/`doctorRegistry` (#27) and the two remaining dead session fields
(#28's `session.profileComplete`, `session.hasOtherRoles` in `getMessageOptions`, and
`session.consentsGiven`) were true no-ops and removed with no behavior change.

Key structural fix beyond the individual items: `/start`'s correct role-branching + live-indicator
logic was extracted into a single shared `sendRoleHomeMenu()` method in `telegramBot.js`, and
`/resume`, `/menu`, `/clear`, and idle-recovery were rewired to call it instead of each keeping
their own (drifted, buggy) copy — this is what actually fixed #10, #11, and #18 at the root,
rather than patching four separate call sites individually.

**#22 follow-up**: implementing the Assign/Reassign Doctor picker surfaced a second, more severe
bug in the same menu that the original audit missed — `handleAdminDoctorManagementSelection`'s
digit-dispatch (`'1'`→view, `'2'`→..., etc.) had drifted out of sync with `buildAdminDoctorManagement`'s
actual button order, so tapping "Invite Doctor" ran the pending-doctors list, "Register Doctor" ran
Assign, "Assign Doctor" ran Reassign, and "Reassign Doctor" ran Register. There was also a
`ReferenceError`-crash bug (stray `text`/`pending` references) waiting behind the
profile-incomplete branch. Both fixed as part of completing #22, since the picker couldn't be
wired to the right button otherwise. See the item below for details.

Compiled from a full source-level trace (not doc-review) of `services/telegramKeyboards.js`,
`services/payloadMap.js`, `src/servers/telegramBot.js`, `services/conversationFlow.js`,
`services/consultationManager.js`, and the persistence layer, dated 2026-07-23. Every item
below was confirmed by reading the actual matching code (file:line cited); nothing here is
inferred from the other audit docs in this repo.

**Root cause pattern**: buttons in `telegramKeyboards.js` emit semantic `callback_data` strings
(e.g. `'verify_payment'`, `'apply_doctor'`). `payloadMap.js` is supposed to translate these into
the digit strings (`'1'`, `'0'`...) that `conversationFlow.js`'s handlers actually parse — but it
only covers 20 of the app's 64 `FlowStates`. Wherever it's missing an entry, the raw semantic
string gets fed straight into a handler expecting a digit, and silently fails, resets, or
misroutes. Fix this class of bug at the root (make `payloadMap` cover every emitted
`callback_data`, or have handlers accept both) rather than patching each symptom individually.

Legend: **CF** = `services/conversationFlow.js`, **TB** = `src/servers/telegramBot.js`,
**TK** = `services/telegramKeyboards.js`, **PM** = `services/payloadMap.js`,
**CM** = `services/consultationManager.js`.

---

## P0 — Critical (core functionality broken, whole role/flow blocked)

### 1. ✅ FIXED — Doctors cannot reply to patients
- **Where**: [telegramBot.js:1601-1619](src/servers/telegramBot.js#L1601-L1619)
- **Bug**: `bot.sendMessage(session.patientPhone, message, ...)` — session objects only ever have
  `.phoneNumber`; the correct field, `consultation.patientPhone`, is one line above, unused.
  `session.patientPhone` is always `undefined`.
- **Impact**: Every doctor, every active consultation. The reply throws, the doctor gets a
  generic "An error occurred" instead of confirmation, and the patient never receives the
  message. This is the primary doctor↔patient channel.
- **Fix**: Change `session.patientPhone` → `consultation.patientPhone` at line 1619.

### 2. ✅ FIXED — Super Admin → Manage Admins is entirely dead
- **Where**: dispatcher switch [conversationFlow.js:816-993](services/conversationFlow.js#L816-L993)
  has no case for `SUPER_ADMIN_MANAGE_ADMINS`
- **Bug**: Any input (button tap or typed digit) in this state falls to `default:` and resets to
  Welcome. `handleSuperAdminManageAdminsSelection` (CF:2789) is unreferenced dead code.
- **Impact**: Super admins cannot add or remove admins through the bot at all.
- **Fix**: Add `case FlowStates.SUPER_ADMIN_MANAGE_ADMINS: return this.handleSuperAdminManageAdminsSelection(...)`.

### 3. ✅ FIXED — Admin/Support "Edit Name" / "Edit Phone" silently discards input
- **Where**: [conversationFlow.js:1661-1663](services/conversationFlow.js#L1661-L1663) only
  special-cases `ADMIN_PROFILE_EDIT`, never `ADMIN_PROFILE_EDIT_NAME` / `ADMIN_PROFILE_EDIT_PHONE`
- **Bug**: After tapping "Edit Name", session moves to `ADMIN_PROFILE_EDIT_NAME`
  ([conversationFlow.js:2414](services/conversationFlow.js#L2414)), but no dispatcher path routes
  that state back into `handleAdminProfileEditInput`. The name/phone-capture logic at CF:2431 and
  CF:2475 is unreachable dead code.
- **Impact**: Typing a new name/phone as an admin or support user is silently thrown away and the
  user is bounced to the Welcome screen.
- **Fix**: Route `ADMIN_PROFILE_EDIT_NAME`/`ADMIN_PROFILE_EDIT_PHONE` to `handleAdminProfileEditInput`
  the same way `ADMIN_PROFILE_EDIT` is (CF:1661), or add explicit dispatcher cases.

### 4. ✅ FIXED — "Apply for Role" buttons are 100% non-functional
- **Where**: `buildRoleApplication` ([telegramKeyboards.js:254-259](services/telegramKeyboards.js#L254-L259))
  emits `apply_doctor`/`apply_caregiver`/`apply_support`; handler
  `handleRoleApplicationSelection` ([conversationFlow.js:2599](services/conversationFlow.js#L2599))
  only recognizes digits `'1'`-`'4'`. State absent from `payloadMap.js`.
- **Impact**: Every tap returns to the Profile menu without ever calling `userRegistry.requestRole()`.
  No user can apply for doctor/caregiver/support role via button.
- **Fix**: Add `ROLE_APPLICATION` to `payloadMap.js` mapping `apply_doctor→'1'`, `apply_caregiver→'2'`,
  `apply_support→'3'`, `cancel→'4'` (already covered by TB:474 fallback for `cancel` specifically,
  but the other three need explicit entries).

### 5. ✅ FIXED — "Remove Role" buttons are 100% non-functional
- **Where**: `buildProfileRemoveRole` ([telegramKeyboards.js:263](services/telegramKeyboards.js#L263))
  emits `remove_doctor`/`remove_caregiver`/`remove_support`; `handleRemoveRole`
  ([conversationFlow.js:2173](services/conversationFlow.js#L2173)) expects bare
  `doctor`/`caregiver`/`support` strings.
- **Impact**: Every tap returns "❌ Invalid role." — no role can ever be removed via the menu.
- **Fix**: Either change the callback_data to the bare role name, or strip the `remove_` prefix in
  the handler/payloadMap.

### 6. ✅ FIXED — Switch Role (Persona Select) — every button broken, including the escape hatch
- **Where**: `buildPersonaSelect` ([telegramKeyboards.js:58-81](services/telegramKeyboards.js#L58-L81));
  `handlePersonaSelection` ([conversationFlow.js:2299](services/conversationFlow.js#L2299)) only
  accepts digits `'0'`-`'5'`. State absent from `payloadMap.js`.
- **Impact**: Once shown (from `/start`/`/menu`'s "Switch Role" or the hidden `status`/`9` keyword),
  **no button works, including "0️⃣ Main Menu"** — users can get stuck on this screen.
- **Fix**: Add `PERSONA_SELECT` to `payloadMap.js`.

### 7. ✅ FIXED — Billing menu buttons don't match the handler at all
- **Where**: `buildBillingMenu` ([telegramKeyboards.js:405-410](services/telegramKeyboards.js#L405-L410))
  offers `payment_status`/`main_menu`; `handleBillingSelection`
  ([conversationFlow.js:1562](services/conversationFlow.js#L1562)) expects `'1'`=Request Payment
  Link, `'2'`=Check Status, `'3'`=Discount — a completely different option set (matching the text-only
  `InteractiveMenus.billing` menu instead, CF:609). Neither button matches either meaning.
- **Impact**: Every tap on the Billing screen returns "❌ Invalid selection."
- **Fix**: Reconcile the keyboard to match the actual 3-option handler and add to `payloadMap.js`.

### 8. ✅ FIXED — Seven different "0️⃣ Back" buttons are broken
- **Where** (all missing from `payloadMap.js`, callback_data is a menu name instead of `'0'`, none
  covered by the TB:474 hardcoded fallback list):
  - `ADMIN_MESSAGE_PATIENT_INPUT` — [telegramKeyboards.js:352](services/telegramKeyboards.js#L352) → [conversationFlow.js:3167](services/conversationFlow.js#L3167)
  - `ADMIN_VERIFY_PAYMENT_INPUT` — [telegramKeyboards.js:354](services/telegramKeyboards.js#L354) → [conversationFlow.js:3133](services/conversationFlow.js#L3133) (confirmed: literal string `admin_menu` gets passed to `paymentService.verifyPaymentManual('admin_menu')` as if it were a transaction ID)
  - `ADMIN_VERIFY_DISCOUNT_INPUT` — [telegramKeyboards.js:356](services/telegramKeyboards.js#L356) → [conversationFlow.js:3089](services/conversationFlow.js#L3089)
  - `ADMIN_SET_FEE_INPUT` — [telegramKeyboards.js:372](services/telegramKeyboards.js#L372) → [conversationFlow.js:3974](services/conversationFlow.js#L3974)
  - `DOCTOR_MSG_ADMIN_INPUT` — [telegramKeyboards.js:340](services/telegramKeyboards.js#L340) → [conversationFlow.js:3917](services/conversationFlow.js#L3917) (confirmed: literal text `doctor_menu` gets forwarded to the admin as the doctor's message body)
  - `ADMIN_ADD_ADMIN_INPUT` — [telegramKeyboards.js:368](services/telegramKeyboards.js#L368) → [conversationFlow.js:3950](services/conversationFlow.js#L3950)
  - `ADMIN_REMOVE_ADMIN_INPUT` — [telegramKeyboards.js:370](services/telegramKeyboards.js#L370) → [conversationFlow.js:3962](services/conversationFlow.js#L3962)
- **Impact**: Users typing/entering data in any of these 7 input screens cannot back out via the
  button; some produce actively wrong behavior (message text corruption, bad API calls) rather
  than just failing silently.
- **Fix**: Add all 7 states to `payloadMap.js` with their back-button's callback_data → `'0'`.

---

## P1 — High (breaks a full role's flow or a major cross-role interaction)

### 9. ✅ FIXED — Discount pending indicator (🔴) never lights up — the design's own #1-priority indicator
- **Where**: `Array.from(consultationManager.sessions?.values || [])` — missing `()` after
  `.values`, so it iterates a function reference instead of the Map, always yielding `[]`.
  6 occurrences: [telegramBot.js:374](src/servers/telegramBot.js#L374),
  [386](src/servers/telegramBot.js#L386), [608](src/servers/telegramBot.js#L608),
  [1001](src/servers/telegramBot.js#L1001), [1110](src/servers/telegramBot.js#L1110),
  [1257](src/servers/telegramBot.js#L1257).
- **Confirms**: `conversationFlow.js` has the *correct* `.values()` call right next to equivalent
  logic (e.g. CF:713, CF:3515) — this is a copy-paste regression, not intentional.
- **Impact**: Per `DESIGN_CASCADING_INDICATORS.md`, "Verify Discount" is the *deepest/highest
  priority* indicator — it can structurally never appear, anywhere, for any admin.
- **Fix**: Add the missing `()` at all 6 sites.

### 10. ✅ FIXED — `/resume` mishandles every non-patient role
- **Where**: [telegramBot.js:760-787](src/servers/telegramBot.js#L760-L787)
- **Bug**: Only checks `session.patientProfile` truthiness; doesn't branch by `effectiveRole` at
  all (unlike `/start`, which does this correctly).
- **Impact**: Admins and doctors — who don't have `session.patientProfile` — get told **"No
  previous session found. Use /start to begin."** and shown the generic patient menu, even though
  they have a fully active admin/doctor session.
- **Fix**: Mirror `/start`'s role-branching logic in `/resume`.

### 11. ✅ FIXED — `/menu` shows Support the wrong keyboard
- **Where**: [telegramBot.js:1022](src/servers/telegramBot.js#L1022) uses
  `buildMainMenu('support', false, true)` instead of the dedicated `buildSupportMenu()`
- **Impact**: Buttons shown don't match what `payloadMap[SUPPORT_MENU]` expects — every button in
  Support's menu is dead when reached via `/menu` (though it works correctly via `/start`).
- **Fix**: Use `telegramKeyboards.buildSupportMenu(hasOtherRoles)` here instead.

### 12. ✅ FIXED — New cascading admin sub-menus aren't in `telegramBot.js`'s domain-state tracking
- **Where**: `telegramBot.js` maintains its own separate `ADMIN_DOMAIN_STATES` / `DOCTOR_DOMAIN_STATES`
  `Set`s ([telegramBot.js:61-100](src/servers/telegramBot.js#L61-L100)), independent from and
  out of sync with the equivalent lists in `conversationFlow.js` ([conversationFlow.js:89-126](services/conversationFlow.js#L89-L126)).
  Missing: `ADMIN_CONSULTATIONS_MENU`, `ADMIN_FINANCES_MENU`, `ADMIN_SYSTEM_MENU`,
  `SUPER_ADMIN_MANAGE_ADMINS`, `ADMIN_PROFILE_EDIT_NAME`, `ADMIN_PROFILE_EDIT_PHONE`,
  `ADMIN_PROFILE_COMPLETE_OPTIONS`, `DOCTOR_PATIENTS_VIEW`.
- **Impact**: Anyone who **types** a number instead of tapping a button while inside any of these
  (newest, cascading-indicator-era) submenus gets forcibly reset to the top-level menu, losing
  their place.
- **Fix**: Either import the single source of truth from `conversationFlow.js` instead of
  maintaining a second copy, or add the missing states to both TB sets.

### 13. ✅ FIXED — Caregivers lose their linked patient on cancel or 30-minute idle timeout
- **Where**: `resetSession()` ([consultationManager.js:171-210](services/consultationManager.js#L171-L210))
  preserves `isCaregiver` but drops `linkedPatientPhone` (never part of the default template or the
  `preservedCaregiverData` bundle).
- **Impact**: `isCaregiver && linkedPatientPhone` is checked as a pair throughout `conversationFlow.js`
  (e.g. CF:2066-2071, CF:2238-2240). After any reset, a caregiver ends up
  `{ isCaregiver: true, linkedPatientPhone: undefined }`, which routes them back to
  `CAREGIVER_PATIENT_LINK` — forced to re-enter the patient's phone number from scratch, even
  though the relationship is meant to be durable. Triggered by: cancel, 30-min idle timeout,
  consent cancel, platform-terms cancel.
- **Fix**: Add `linkedPatientPhone: session.linkedPatientPhone` to `resetSession()`'s preserved
  fields, alongside the other caregiver fields.

### 14. ✅ FIXED — "8️⃣ Other/General" cancer type is dead
- **Where**: Button emits `cancer_other` ([telegramKeyboards.js:203](services/telegramKeyboards.js#L203));
  `payloadMap.js` maps `cancer_general` instead.
- **Impact**: Tapping "Other/General" just redisplays the same cancer-type menu with no explanation.
- **Fix**: Change the `payloadMap.js` key from `cancer_general` to `cancer_other` (or vice versa,
  matching whichever the keyboard uses).

### 15. ✅ FIXED — Admin Profile Edit → "3️⃣ View Profile" is broken
- **Where**: `payloadMap.js`'s `ADMIN_PROFILE_EDIT` entry has `edit_name`/`edit_phone`/`cancel` but
  not `view_profile` ([telegramKeyboards.js:329](services/telegramKeyboards.js#L329)).
- **Impact**: Tap falls into `handleAdminProfileEditInput`'s dead-end "legacy format" branch
  ([conversationFlow.js:2512-2527](services/conversationFlow.js#L2512-L2527)), returning "No valid
  fields found" instead of the profile.
- **Fix**: Add `view_profile: '3'` to the `ADMIN_PROFILE_EDIT` payloadMap entry.

### 16. ✅ FIXED — Mobile-number collection "0️⃣ Skip" button is dead, and the wrong keyboard is shown for it anyway
- **Where**: `mobile_skip` callback doesn't match what `handleMobileCollection`
  ([conversationFlow.js:1844](services/conversationFlow.js#L1844)) checks (`'0'`/`'skip'`); separately,
  `getKeyboard()` ([telegramBot.js:318](src/servers/telegramBot.js#L318)) groups `MOBILE_COLLECTION`
  with `WELCOME` and always shows `buildMainMenu()` instead of `buildMobileCollection()` when
  reached via the callback-query path.
- **Fix**: Add `mobile_skip → '0'` to `payloadMap.js`; give `MOBILE_COLLECTION` its own branch in
  `getKeyboard()`.

### 17. ✅ FIXED — `ROLE_SELECT` shows the wrong keyboard
- **Where**: Same `getKeyboard()` grouping bug as #16 — [telegramBot.js:318](src/servers/telegramBot.js#L318)
  shows `buildMainMenu()` instead of `buildRoleSelect()`.
- **Fix**: Give `ROLE_SELECT` its own branch in `getKeyboard()`.

---

## P2 — Medium (visible UX/indicator inconsistency, not a hard blocker)

### 18. ✅ FIXED — `/resume`, `/clear`, and idle-timeout recovery show stale indicators
- **Where**: [telegramBot.js:752](src/servers/telegramBot.js#L752),
  [772](src/servers/telegramBot.js#L772), [783](src/servers/telegramBot.js#L783),
  [1233](src/servers/telegramBot.js#L1233) — all hardcode `profileComplete = true` and omit
  pending/active consultation counts. Only `/start` computes these live.
- **Impact**: A user with an incomplete profile who recovers their session via `/resume`/`/menu`/
  idle-timeout (instead of `/start`) sees a falsely-green Profile menu item.
- **Fix**: Route all four call sites through the same `conversationFlow.isProfileComplete(session)`
  + pending/active lookups that `/start` already does.

### 19. ✅ FIXED — `ADMIN_FINANCES_MENU`'s fallback keyboard hardcodes no-pending state
- **Where**: [telegramBot.js:540](src/servers/telegramBot.js#L540) —
  `buildAdminFinancesMenu(false, false)` regardless of actual state.
- **Impact**: If this fallback path is hit (i.e. `getKeyboard()` didn't already handle it), Verify
  Payment/Verify Discount indicators are wrong.
- **Fix**: Compute real `hasPendingPayments`/`hasPendingDiscounts` here, matching the pattern used
  elsewhere.

### 20. ✅ FIXED — `userRegistry.js` has its own (buggy) phone normalizer, diverging from the shared utility
- **Where**: `services/userRegistry.js` local `normalizePhone` unconditionally strips a leading
  `"91"`; `utils/phone.js`'s shared version only does so when the number is longer than 10 digits.
- **Impact**: A genuine 10-digit number starting with "91" (e.g. `9187654321`) normalizes
  differently depending on which lookup path is used — silent user-lookup failures for that class
  of numbers.
- **Fix**: Delete the local copy in `userRegistry.js`; use `utils/phone.js`'s `normalizePhone`
  everywhere, as `adminRegistry.js` and `models/persona.js` already do.

### 21. ✅ FIXED — Discount category codes don't match their own lookup table
- **Where**: `categoryMap` in [conversationFlow.js:3681-3691](services/conversationFlow.js#L3681-L3691)
  writes `eshram`/`rural_tribal`/`defence`/`teacher_anganwadi`/`pwd_udid`; `DISCOUNT_TIERS` in
  `services/paymentService.js` keys the same categories as `e_shram`/`rural_tribal_resident`/
  `defence_exservicemen`/`teacher_angadiwadi` (also a typo swap vs "anganwadi")/`pwd`.
- **Impact**: Currently dormant — discount % is hardcoded to `0` at every call site today — but the
  lookup silently returns `undefined → 0%` for 5 of the ~18 categories the moment anyone wires up
  auto-calculated discounts or an "expected discount" display.
- **Fix**: Reconcile the two key sets now, before it becomes load-bearing.

### 22. ✅ FIXED — Admin "Assign Doctor" / "Reassign Doctor" require manually typing raw IDs
- **Where**: [conversationFlow.js:2896](services/conversationFlow.js#L2896) (`CONSULTATION_ID
  DOCTOR_ID` free text), despite "View Patients"/"View Doctors" existing as separate read-only
  screens with no way to jump from there into assignment.
- **Impact**: Pure UX gap — admin has to cross-reference two screens and type IDs from memory/notes.
- **Fix applied**: Replaced with a two-step inline picker for both flows: tap "Assign Doctor" →
  pick the waiting consultation from a numbered list → pick a doctor from a numbered list →
  assigned. "Reassign Doctor" works the same way, excluding the currently-assigned doctor from the
  second list. New states `ADMIN_ASSIGN_DOCTOR_SELECT`/`ADMIN_ASSIGN_DOCTOR_PICK`/
  `ADMIN_REASSIGN_DOCTOR_SELECT`/`ADMIN_REASSIGN_DOCTOR_PICK` in `conversationFlow.js`, matching
  keyboard builders in `telegramKeyboards.js` (using plain-digit `callback_data` since these lists
  are dynamically sized, so no fixed `payloadMap` entry could name them), and rendering wired into
  `telegramBot.js`'s callback-query fallback switch + `ADMIN_DOMAIN_STATES`. Old free-text handlers
  (`handleAdminAssignDoctorInput`/`handleAdminReassignDoctorInput`) left in place but unreachable
  from the menu.
- **Bug found and fixed along the way**: `handleAdminDoctorManagementSelection`'s digit-dispatch had
  drifted out of sync with `buildAdminDoctorManagement`'s actual button numbering — tapping
  "Invite Doctor" (button 2) ran the pending-doctors list, "Register Doctor" (3) ran Assign,
  "Assign Doctor" (4) ran Reassign, and "Reassign Doctor" (8) ran Register. Also fixed a
  `ReferenceError` crash (stray `text`/`pending` references) in the profile-incomplete branch of
  the same function. Verified end-to-end with a standalone simulation script exercising both full
  flows (see conversation) plus `npm test` (262/262 passing, up from 254 as new `FlowStates` are
  picked up by the state-machine fuzzer).

### 23. ✅ FIXED — `PROFILE_DISCOUNT_CATEGORY` and `PROFILE_CONSENTS` have no back/cancel button
- **Where**: [telegramKeyboards.js:265-270](services/telegramKeyboards.js#L265-L270) (discount
  primary category picker) and [telegramKeyboards.js:301](services/telegramKeyboards.js#L301)
  (consents).
- **Impact**: User who wants to back out of these two screens has no button to do so (must know to
  type `0` or restart via `/menu`).
- **Fix**: Add a `0️⃣ Back` button to both keyboards and wire it through `payloadMap.js`.

---

## P3 — Low (cleanup, dead code, minor friction — no active user impact today)

### 24. ✅ FIXED — `/roles` command is a dead-end keyboard
- **Where**: [telegramBot.js:869-891](src/servers/telegramBot.js#L869-L891) calls
  `buildMyRoles()` ([telegramKeyboards.js:261](services/telegramKeyboards.js#L261)), whose
  `role_${roleName}` buttons have no matching handler anywhere in the codebase, and the keyboard
  has no back button at all.
- **Secondary bug**: its help text says `Use "APPLY:ROLE"` — the real command is `/apply <role>`.
- **Fix**: Either wire `role_${r}` callbacks to something useful, or replace the keyboard with a
  simple "0️⃣ Back to Menu" button; fix the help text.

### 25. ✅ FIXED — `/apply` (no arguments) shows a keyboard without setting the matching flow state first
- **Where**: [telegramBot.js:833-847](src/servers/telegramBot.js#L833-L847) shows
  `buildRoleApplication()` but never sets `session.flowState = ROLE_APPLICATION` beforehand.
- **Impact**: Tapping a button resolves against whatever state the session was already in, not
  `ROLE_APPLICATION` — compounds with #4 above once that's fixed.
- **Fix**: Set `flowState` before sending the keyboard.

### 26. ✅ FIXED — `buildMainMenu()` accepts `isAdmin`/`isSuperAdmin` params it never uses
- **Where**: [telegramKeyboards.js:5-25](services/telegramKeyboards.js#L5-L25) — the function
  signature takes both params but the body never references them.
- **Impact**: None today (not called for admin roles on the main path), but misleading — reads as
  if it role-branches when it doesn't.
- **Fix**: Remove the unused params, or implement the branching if it was actually intended.

### 27. ✅ FIXED — Dead parallel data stores: `patientRegistry` / `doctorRegistry`
- **Where**: `models/patient.js` (`patientRegistry`) and `models/doctor.js` (`doctorRegistry`) —
  complete, self-contained CRUD implementations, including a `verifyDiscount()` using the exact
  same field name as the real path, that are never called from anywhere else in the repo and never
  persisted to disk.
- **Impact**: None today — the real stores are `consultationManager`'s sessions and
  `doctorPersistence.js`. Risk is a future dev wiring these in, thinking they're live.
- **Fix applied**: Deleted both objects entirely. `PatientProfile`/`DoctorProfile`/
  `DoctorSpecialties`/`CancerSpecializations` (the classes/constants, which *are* live and used
  throughout `doctorPersistence.js`, `doctorRouter.js`, `masterDataManager.js`, `models/masterData.js`,
  `routes/doctor.js`) were kept and re-verified against every import site before removal.

### 28. ✅ FIXED — Vestigial fields: `session.profileComplete`, `session.pendingPayment`, `session.consentsGiven`
- **Where**: `session.profileComplete` (and `session.hasOtherRoles`, same pattern, found while
  fixing this) read in `getMessageOptions()` but never written anywhere (the real completeness
  check is the `isProfileComplete()` method, a separate code path). `session.pendingPayment` was
  only ever set to `null`. `session.consentsGiven` was set nowhere and read nowhere.
- **Impact turned out non-trivial for `pendingPayment`**: its one real read, in
  `handleAdminSetFeeInput`, was the *entire gate* on Admin "Set Fee" - since the field was always
  falsy, Set Fee unconditionally replied "No pending payment found" for every admin, always. A
  second bug was hiding behind that dead gate: `paymentService.setFee(targetPhone, ...)` was
  called with a phone number where `setFee` requires a transaction ID (its `payments` Map is keyed
  by transaction ID) - so even bypassing the dead gate wouldn't have made it work.
- **Fix applied**: Removed the three dead session fields (from `consultationManager.js`'s session
  template, the one no-op write in `executeWithdrawal`, and the two dead reads in
  `getMessageOptions`, replaced with the constants they always evaluated to). Rewrote
  `handleAdminSetFeeInput` to look up the target's actual pending transaction in
  `paymentService.payments` (by phone + `status: 'pending'`) and call `setFee(transactionId, ...)`
  correctly. Verified end-to-end with a standalone script: creates a fee-pending transaction, runs
  the real handler, confirms `amount`/`feePending`/`adminNote` all update as expected.

### 29. ✅ FIXED — `PersistenceManager.paymentsFile` is declared but never used
- **Where**: [consultationManager.js:18](services/consultationManager.js#L18) — declared in the
  constructor, never read or written by `load()`/`save()`.
- **Impact**: None (doesn't collide with `PaymentService`'s independent `payments.json` handling),
  just confusing — implies `ConsultationManager` owns payment persistence when it doesn't.
- **Fix**: Remove the dead field.

### 30. ✅ FIXED — Data-directory git-tracking inconsistency
- **Where**: `data/admins.json`, `data/doctors.json`, `data/masterdata.json` are tracked in git;
  `.gitignore` explicitly excludes `data/sessions.json`/`data/payments.json` as runtime state — but
  `data/users.json`, `data/pending_doctors.json`, and `data/consultations.json` are neither tracked
  nor gitignored.
- **Impact**: Once real usage creates these files, they risk being accidentally `git add`-ed
  (leaking user PII/pending invitations), or having no backup policy at all if intentionally left
  out.
- **Fix**: Add the three to `.gitignore` explicitly (matching the treatment of sessions/payments),
  or document the intended policy if they should be tracked.

### 31. No cross-process/file locking in persistence (architectural note, not a live bug)
- **Where**: All persistence layers (`userRegistry`, `adminRegistry`, `doctorPersistence`,
  `consultationManager`, `paymentService`) use write-to-`.tmp` + atomic rename, which is safe
  per-process but has no cross-process read-modify-write coordination.
- **Impact**: Not exploitable today — single Node process, no `await` between check-and-write, so
  Node's single-threaded event loop makes each mutation atomic in practice. Becomes a real
  last-writer-wins risk only if this is ever scaled to multiple processes/instances.
- **Fix**: No action needed unless/until a multi-instance deployment is planned; document as a
  "must stay single-instance" constraint if not already noted in `SETUP.md`.

---

## Notes on scope/method

- Items 1-17 were confirmed via direct code reads cross-referencing `telegramKeyboards.js` callback_data
  literals against every `===`/switch-case comparison in `conversationFlow.js` and `telegramBot.js`.
- Items 18-23 came from tracing the "cascading indicator" data flow (the feature described in
  `DESIGN_CASCADING_INDICATORS.md`) from source (`consultationManager`/`paymentService`/`userRegistry`)
  through to each menu-render call site.
- Items 24-31 came from a full read of the persistence layer (`userRegistry.js`, `adminRegistry.js`,
  `doctorPersistence.js`, `consultationManager.js`, `paymentService.js`, `discountService.js`,
  `models/*.js`) plus `resetSession()`'s field-by-field diff against every `session.*` read site.
- Not re-covered here: items already fixed per prior session memory (profile flow CANCEL/0 escape
  hatches, caregiver back-nav, `/health`/`/ready` endpoints, admin API key auth) — see git log for
  `feature/ux-overhaul` if you need that history.

---

## Test Coverage Gap Analysis (2026-07-24)

**Root cause pattern**: Every bug class fixed here wasn't "missing test" — it was "tested the logic layer, not the user layer." The following gaps remain.

### **Gap 1: Real Entry Point Testing**
**Current status**: Only `test/typed_navigation_keyboards.test.js` (4 tests) exercises `TelegramAdapter` directly. All other 267 tests call `conversationFlow.js` methods directly, bypassing `telegramBot.js`'s message routing entirely.

**Evidence from TOFIXGAPS.md**:
- #6 (Switch Role dead): `telegramKeyboards.js:58-81` emits `apply_doctor`, but handler expects `'1'`-`'4'`. No test exercised the callback path.
- #14 (8️⃣ Other/General cancer type dead): `payloadMap.js` maps `cancer_general` instead of `cancer_other`. Unit tests for `handleCancerSelection` passed because they tested the handler in isolation.
- #22 (Assign/Reassign Doctor): Button order had drifted (`telegramKeyboards.js:58-81` vs `conversationFlow.js:816-993`). Only manual testing caught this.

**Missing tests needed**:
- Tap button → verify next state transition in `telegramBot.js`'s `handleCallbackQuery`.
- Type digit → verify `sendTypedNavigationReply` attaches `reply_markup`.
- Every state that has both tap and type paths should have identical outcome assertions.

### **Gap 2: Agreement Between Code Paths**
**Current status**: `ux-modernization.test.js` has "Dual-Support Contract: Missing Button Audit" (8 assertions) checking button counts vs text. Not systematic.

**Evidence from TOFIXGAPS.md**:
- #21 (Discount categories): `conversationFlow.js:3681-3691` vs `paymentService.js` key mismatch (`eshram` vs `e_shram`, `teacher_anganwadi` vs `teacher_angadiwadi`, etc). No test asserted the two key sets agree.
- #19 (Finances fallback keyboard): `telegramBot.js:540` hardcoded `buildAdminFinancesMenu(false, false)` regardless of actual pending-payment/discount state. No test rendered this specific fallback path with real pending data to catch the hardcode.

**Missing tests needed**:
- For every `FlowState`: `keyboard.buttons.length === textMenuOptions.length`.
- For every indicator: `keyboardButton.indicator === textMenu.indicator`.
- Assert `buildKeyboardForState` output matches `InteractiveMenus` template for the same facts.

### **Gap 3: Tap vs. Type Coverage Matrix**
**Current status**: 
- `typed_navigation_keyboards.test.js`: Covers typed navigation for `ADMIN_MENU`, `PERSONA_SELECT`.
- `ux-modernization.test.js`: Covers typed navigation for `WELCOME`, `PROFILE_DISCOUNT_CATEGORY`.
- **Missing**: Doctor, Caregiver, Support typed navigation; admin/doctor sub-menu typed paths.

**Evidence from TOFIXGAPS.md**:
- #7 (Billing menu): "Every tap returns to the Profile menu without ever calling." Button taps never reach the handler because `payloadMap.js` doesn't map billing callbacks. Typing works because it bypasses `payloadMap.js`.
- #12 (Domain state guards): Typed navigation resets users from `ADMIN_CONSULTATIONS_MENU` because it wasn't in `ADMIN_DOMAIN_STATES`. Button path worked fine.

**Missing tests needed**:
- All 64 FlowStates should have both:
  - `tap Navigation` test: Press button → verify state via `handleCallbackQuery`.
  - `type Navigation` test: Type digit → verify state via `sendTypedNavigationReply`.

### **Gap 4: Role × Role-Boundary Tests**
**Current status**: `e2e-lifecycle.test.js` has 4 lifecycle tests, but they don't stress boundary conditions.

**Evidence from TOFIXGAPS.md**:
- #13 (Caregiver reset): `resetSession()` drops `linkedPatientPhone`. This only manifests when a caregiver triggers a reset, which no test simulates.
- #15 (Profile view back button): `payloadMap.js` missing `view_profile` mapping. Only visible when admin taps "3️⃣" after typing to reach the screen first.
- #18 (`/resume` wrong role): `/resume` checks `patientProfile` but not `effectiveRole`. Survived because no test mixed role types.

**Missing tests needed**:
- `doctor → patient` handoff: Doctor replies to patient → verify patient receives message.
- `admin → doctor` handoff: Admin assigns doctor → verify doctor session reflects assignment.
- `caregiver → patient` link: Caregiver cancels → restart → verify link persists.
- Cross-role: Admin types `/menu` → patient taps → verify both get correct keyboards.

### **Gap 5: Idempotent, Isolated Test Runs** — largely closed as of 2026-07-24, see correction below
**Corrected status** (the two bullets originally here were stale — verified 2026-07-24 against actual file contents, not re-inferred from memory of an earlier pass): all 11 test files were checked. 8 touch persistence and all 8 use `process.env.DATA_DIR` isolation with a `test.after`/equivalent `fs.rmSync(..., {recursive:true,force:true})` cleanup scoped to that isolated dir (`persistence.test.js` aliases `process.env.DATA_DIR` to a local `const DATA_DIR`, which is why a naive grep for the literal string missed it). The other 3 (`telegram_integration.test.js`, `phone.test.js`, `menu_tree.test.js`) correctly don't need isolation — no persistence touched. `e2e-lifecycle.test.js`'s `test.after` does a full `DATA_DIR` wipe, not a `sessions.json`-only clean. `comprehensive_audit.test.js`'s admin add/remove calls are each paired (`addAdmin('9999999999', ...)` immediately followed by `removeAdmin('9999999999')`, same for `'8888888888'` and `'admin_phone'`) — no order dependency found. This was exactly the bug class already fixed earlier this session (commit `42e3038`, "fix test-suite production-data isolation") — the two false claims above were describing pre-fix state as if still current. Running the full suite twice back-to-back and diffing the real `data/` directory produces no changes (verified live during that pass).
- Bugs #27/#28 were "vestigial fields" but tests asserted behavior on pre-initialized sessions, never testing true first-run state — this specific observation still stands and isn't covered by the isolation fix above.

**Remaining gap**: singleton registries (`adminRegistry`, `userRegistry`, `doctorRouter`) persist in-memory state across tests *within* a single test file's process even with `DATA_DIR` isolated on disk — that's why `comprehensive_audit.test.js` has to manually pair every add with a remove rather than relying on isolation to reset it. A `beforeEach` singleton-reset helper would remove the need for that manual discipline.

### **Gap 6: Live-Data Simulation Over Mocks**
**Current status**:
- `state-fuzzer.test.js`: Uses real `ConsultationManager` but mocks `ConversationFlow` context.
- `e2e-lifecycle.test.js`: Creates real consultation/payment records.
- Most other tests stub `adminRegistry.isAdmin = () => true` instead of real `addAdmin()`.

**Evidence from TOFIXGAPS.md**:
- #9 (discount indicator): Missing `()` on `.values()`. This was invisible to tests because:
  - `state-fuzzer.test.js` uses real `ConsultationManager` but never sets `patientProfile.discountVerificationStatus: 'pending'`.
  - `comprehensive_audit.test.js` tests `discountVerificationStatus` in isolation but never links it to indicator rendering.
- Doctor-lookup-by-chat-id (not separately numbered above — found and fixed 2026-07-24, commit `720b117`): ~18 call sites across `telegramBot.js`/`conversationFlow.js` each reimplemented `d.telegramId === X || phone-strip === X` independently, in three subtly different (inconsistent) shapes. Tests were passing because they exercised doctors with `telegramId` already set, never the phone-only pre-`/start` path where the inconsistency actually bites. Centralized into `doctorPersistence.findByChatId`/`findPendingByChatId`/`chatIdFor`; two real latent bugs (a wrong-field comparison, a call to a method that was never defined) surfaced and were fixed in the process specifically because consolidating forced every call site through one path.

**Missing tests needed**:
- Replace `adminRegistry.isAdmin = () => true` with `adminRegistry.addAdmin(chatId, ...)` in all tests.
- Create real `Payment` objects with `status: 'pending'` instead of stubbing `paymentService`.
- Fuzz `doctorPersistence.findByChatId` with phone-only doctors (no `telegramId` set).

---

**Priority for next iteration**:
1. Expand `typed_navigation_keyboards.test.js` to cover all 64 FlowStates.
2. Add "keyboard state == text state" assertions to the dual-support contract tests.
3. Write cross-role handoff scenarios as targeted integration tests.
