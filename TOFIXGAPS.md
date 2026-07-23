# To-Fix Gaps — Menu / Navigation / State / Persistence Audit

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
