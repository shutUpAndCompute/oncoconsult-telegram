# Audit Report: Oncology Consultation Telegram Bot

**Audit Date:** 2026-07-12
**Auditor:** Kilo AI
**System:** Oncology Consultation Telegram Bot v1.0.0

---

## 1. EXECUTIVE SUMMARY

> **Update (post live-execution testing):** this audit's methodology was
> static - checking that a given handler function *exists* at a given line,
> not that anything actually *calls* it end-to-end. Three of the rows below
> were marked ✅ PASS on exactly that basis and were, in fact, completely
> broken - live-executing the flows (mocked Telegram client driving real
> `bot.processUpdate()` calls, not just reading the source) surfaced this
> immediately. See Section 16 for what was actually wrong and the fixes
> applied. Corrected rows marked below; original text struck through.

| Category | Status | Notes |
|----------|--------|-------|
| Code Quality | ✅ PASS | All tests pass, syntax verified |
| Role Detection | ~~✅ PASS~~ **🔴 was broken, now fixed** | `ADMIN_PHONES` was checked in dozens of individual admin-handler functions but never in `identifyPersona()`/`getAvailableRoles()` (the functions that actually drive routing) - an `ADMIN_PHONES`-listed user was treated as a fresh patient forever. This audit's own Section 4 only verified `SUPER_ADMIN_CHAT_IDS`/`PHONES`, never `ADMIN_PHONES` - missing exactly the broken path. Fixed in `models/persona.js`. |
| Profile Completeness | ⚠️ PARTIAL | Env-seeded admins need profile completion (accurate as originally written) |
| Consultation Flow | ~~✅ PASS~~ **🔴 was fully broken, now fixed** | "Consultation Creation ✅" (Section 6.1) cited `consultationManager.js:218-245` - the `createConsultation()` function *existing*, not that anything ever called it. It didn't: the automatic-assignment function that used to call it has zero callers, and the manual-pick alternative is dispatched from a state nothing ever transitions into. A fully-paid, fully-verified patient had no consultation record for an admin to ever assign a doctor to. Fixed in `services/conversationFlow.js`. |
| Payment Flow | ~~✅ PASS~~ **🔴 was fully broken, now fixed** | "Patient requests payment ✅" (Section 7.1) cited the Billing menu handler existing - it never actually generated a payment transaction, so `session.paymentTransaction` stayed permanently unset, which broke `/feebased`, Verify Payment, and payment-status checking for every patient. Fixed in `services/conversationFlow.js`. |
| Role Approval | ✅ PASS | Super admin exclusive controls working (verified live, accurate as originally written) |
| Data Persistence | ✅ PASS | All data files present and valid |

**Overall Status:** ⚠️ Was NOT ready for testing as originally assessed - the
consultation/payment lifecycle (the core business flow) could not have
completed end-to-end. Now fixed and verified live (52/52 assertions passing
against `DETAILED_TEST_PLAN.md`). See Section 16.

---

## 2. CODE CHANGES AUDIT

### 2.1 Fix Applied: ensureEnvSeededAdminRecord()

**File:** `src/servers/telegramBot.js`

**Change Summary:**
- Added `ensureEnvSeededAdminRecord()` function (lines 14-34)
- Added `normalizePhone` import (line 4)
- Added `SUPER_ADMIN_CHAT_IDS`, `SUPER_ADMIN_PHONES` imports (line 3)
- Modified `/start` handler (line 303) to call ensure function
- Modified `/menu` handler (line 558) to call ensure function

**Code Review:**
```javascript
function ensureEnvSeededAdminRecord(chatId) {
  const adminRecord = adminRegistry.getAdmin(String(chatId));
  if (adminRecord) return adminRecord;
  
  const normalized = normalizePhone(String(chatId));
  const isSuperAdminChat = SUPER_ADMIN_CHAT_IDS.includes(String(chatId));
  const isSuperAdminPhone = SUPER_ADMIN_PHONES.includes(String(chatId)) || 
                            SUPER_ADMIN_PHONES.includes(normalized);
  const isAdminPhone = process.env.ADMIN_PHONES?.split(',')?.map(p => p.trim().replace('+', '')).includes(String(chatId)) ||
                       process.env.ADMIN_PHONES?.split(',')?.map(p => p.trim().replace('+', '')).includes(normalized);
  
  if (isSuperAdminChat || isSuperAdminPhone) {
    return adminRegistry.addAdmin(String(chatId), String(chatId), String(chatId), 'super_admin', null);
  }
  
  if (isAdminPhone) {
    return adminRegistry.addAdmin(String(chatId), String(chatId), String(chatId), 'admin', null);
  }
  
  return null;
}
```

**Status:** ✅ APPROVED

---

## 3. DATA STATE AUDIT

### 3.1 Current Data Files

| File | Status | Records | Notes |
|------|--------|---------|-------|
| admins.json | ✅ Valid | 0 | Empty (env-seeded admins not yet activated) |
| doctors.json | ✅ Valid | 4 | Pre-registered doctors present |
| sessions.json | ✅ Valid | 1 | Session for 7935248399 exists |
| users.json | ✅ Valid | 1 | Doctor user approved |
| payments.json | ✅ Valid | [] | Empty |
| consultations.json | ✅ Valid | [] | Empty |
| pending_doctors.json | ✅ Valid | [] | Empty |

### 3.2 Session Analysis

**Active Session:** `7935248399`
- Flow State: `admin_menu`
- Payment Verified: `false`
- Selected Persona: `null`
- Last Activity: 2026-07-11T17:27:05

**Issue Identified:** Session shows admin_menu but no admin record exists in admins.json.

**Root Cause:** The session was created before the fix was applied.

**Resolution Required:** Restart the bot to trigger `ensureEnvSeededAdminRecord()`.

---

## 4. ROLE DETECTION VERIFICATION

### 4.1 Super Admin Detection Chain

**Test ID:** DET-001

| Check | Location | Status |
|-------|----------|--------|
| SUPER_ADMIN_CHAT_IDS check | persona.js:117 | ✅ |
| SUPER_ADMIN_PHONES check | persona.js:120 | ✅ |
| adminRegistry check | persona.js:138-148 | ✅ |
| availableRoles includes super_admin | persona.js:65-68 | ✅ |

**Expected Result for Chat ID 7935248399:**
- `persona.type` = `super_admin`
- `availableRoles` = `['super_admin', 'patient']`

**Status:** ✅ VERIFIED (super_admin chain only)

### 4.2 Plain Admin Detection Chain (ADMIN_PHONES) - missing from this audit, found broken

**Test ID:** DET-002 (added post-audit)

This audit verified the *super_admin* env-seeding chain but never checked
the plain-`admin` equivalent (`ADMIN_PHONES`), which turned out to be
completely non-functional:

| Check | Location | Status (at time of this audit) |
|-------|----------|--------|
| `ADMIN_PHONES` checked in `identifyPersona()` | persona.js | ❌ Not present at all |
| `ADMIN_PHONES` checked in `getAvailableRoles()` | persona.js | ❌ Not present at all |

`ADMIN_PHONES` *was* checked in ~15 individual admin-handler functions
throughout `conversationFlow.js`/`telegramBot.js` as a fallback
authorization check, and in the newly-added `ensureEnvSeededAdminRecord()`
itself - but never in the two functions that actually decide `effectiveRole`
for routing. A chat ID listed only in `ADMIN_PHONES` was routed as a fresh
patient on every single message and could never reach any of those admin
checks in the first place, since routing never got them there.

**Fixed:** `models/persona.js` now checks `ADMIN_PHONES` in both
`identifyPersona()` and `getAvailableRoles()`, with `ADMIN` precedence
between `SUPER_ADMIN` and `SUPPORT`. Verified live with the exact test
account from `DETAILED_TEST_PLAN.md` (chat ID `8888777766`,
`ADMIN_PHONES=8888777766`).

**Status:** 🔴 was broken → ✅ fixed and verified

---

## 5. ONBOARDING FLOW VERIFICATION

### 5.1 Super Admin Onboarding (ONB-001)

**Test Steps Executed:**

| Step | Action | Expected | Actual | Status |
|------|--------|----------|--------|--------|
| 1 | Send `/start` | Admin menu shown | N/A | ❓ |
| 2 | Check admins.json | Record created | 0 records | ❓ |
| 3 | Verify super admin options | Options 11/12 visible | N/A | ❓ |

**Required Test:** Bot restart required to trigger `ensureEnvSeededAdminRecord()`.

### 5.2 Patient Onboarding (ONB-003)

**Test Steps Executed:**

| Step | Action | Expected | Actual | Status |
|------|--------|----------|--------|--------|
| 1 | `/start` new chat | MOBILE_COLLECTION | ✅ |
| 2 | Send phone | ROLE_SELECT | ✅ |
| 3 | Complete profile | WELCOME | ✅ |
| 4 | Check sessions.json | Patient profile saved | ✅ |

**Status:** ✅ VERIFIED

---

## 6. CONSULTATION LIFECYCLE AUDIT

### 6.1 Consultation Creation Flow

**Test ID:** CONS-001

> **Correction (post live-execution testing):** every row below was marked ✅
> by confirming the referenced function/file exists, not by actually
> exercising the flow. Live-executing it (see `DETAILED_TEST_PLAN.md`
> Section 15) found two of these five phases completely non-functional -
> "Request Payment Link" never created anything for "Payment Pending" to
> track, and "Consultation Creation" was never actually reached from any
> live code path at all.

| Phase | Component | Status (original) | Status (verified live) |
|-------|-----------|--------|--------|
| Request Payment Link | `handleBillingSelection`, conversationFlow.js | ✅ | 🔴 was broken - never generated a payment transaction; `session.paymentTransaction` stayed null forever → ✅ fixed |
| Payment Pending | consultationManager.js:218-245 | ✅ | ✅ (the state transition itself worked; nothing to transition *to* until the fix above) |
| Admin Fee Setting | telegramBot.js `/feebased` handler | ✅ | ✅ (works correctly once a transaction actually exists) |
| Payment Verification | `handlePaymentStatusCheck`, conversationFlow.js | ✅ | ✅ (works correctly; the verification logic itself was fine) |
| Consultation Creation | `consultationManager.createConsultation()` | ✅ | 🔴 was unreachable - the function exists and works, but nothing in the live patient-facing flow ever called it (`handleConsultationRequest`, which used to, has zero callers; the manual alternative is dispatched from a state, `DOCTOR_SELECT`, that nothing transitions into) → ✅ fixed by having payment verification create the consultation as pending, matching `getPendingForAdmin()`'s own definition |

### 6.2 Doctor-Patient Communication

| Feature | Location | Status (original) | Status (verified live) |
|---------|----------|--------|--------|
| Doctor receives notification | telegramBot.js, menu-driven doctor-assign notification block | ✅ | 🔴 was broken - the initial "Assign Doctor" notification only ever messaged the *patient*; the doctor themselves was never told they'd been assigned a consultation (only *re*-assignment notified both sides) → ✅ fixed to match the reassignment pattern |
| Doctor messages patient | conversationFlow.js:2694+ | ✅ | ✅ |
| Patient receives doctor reply | telegramBot.js:576-589 | ✅ | ✅ |

---

## 7. PAYMENT VERIFICATION AUDIT

### 7.1 Payment Flow

**Test ID:** PAY-001

| Step | Component | Status (original) | Status (verified live) |
|------|-----------|--------|--------|
| Patient requests payment | `handleBillingSelection`, conversationFlow.js | ✅ | 🔴 was broken (see Section 6.1) → ✅ fixed |
| Admin receives notification | telegramBot.js:988-1001 | ✅ | ✅ |
| Admin sets fee | telegramBot.js `/feebased` handler | ✅ | ✅ (requires `session.paymentTransaction` to exist first, which required the Section 6.1 fix) |
| Fee-based command | conversationFlow.js `setFee()` | ✅ | ✅ |

**Note:** Payment verification requires external gateway integration for
real transactions; manual verification (`verifyPaymentManual`, used by the
menu-driven Verify Payment option) works correctly and was exercised live.

---

## 8. ROLE APPROVAL AUDIT

### 8.1 Super Admin Exclusive Operations

| Operation | Handler | Status |
|-----------|---------|--------|
| View Role Applications | conversationFlow.js:2193-2216 | ✅ |
| Approve Doctor | conversationFlow.js:2218-2258 | ✅ |
| Approve Caregiver | conversationFlow.js:2260-2291 | ✅ |
| Approve Support | conversationFlow.js:2293-2324 | ✅ |
| Add Admin | conversationFlow.js:2451-2533 | ✅ |
| Remove Admin | conversationFlow.js:2331-2371 | ✅ |

### 8.2 Regular Admin Restrictions

| Operation | Status |
|-----------|--------|
| View applications | ❌ Blocked (super_admin only) |
| Approve roles | ❌ Blocked (super_admin only) |
| Add/Remove admins | ❌ Blocked (super_admin only) |
| View all patients | ❌ Blocked (super_admin only) |

**Status:** ✅ VERIFIED

---

## 9. EDGE CASE AUDIT

### 9.1 Invalid Input Handling

| Component | Test | Status |
|-----------|------|--------|
| Menu re-prompt | conversationFlow.js:341+ | ✅ |
| Invalid option | flowMap default | ✅ |
| Cancel operations | selection === '0' | ✅ |

### 9.2 Profile Incomplete Blocking

| Handler | Status |
|---------|--------|
| ADMIN_MENU | ✅ (allows 5, 0) |
| ADMIN_DOCTOR_MANAGEMENT | ✅ |
| ADMIN_ASSIGN_DOCTOR_INPUT | ✅ |
| ADMIN_APPROVE_DOCTOR_INPUT | ✅ |

**Status:** ✅ VERIFIED

---

## 10. DATA PERSISTENCE AUDIT

### 10.1 Persistence Files

| File | Purpose | Status |
|------|---------|--------|
| sessions.json | User sessions | ✅ |
| consultations.json | Consultation records | ✅ |
| doctors.json | Doctor registry | ✅ |
| admins.json | Admin registry | ✅ |
| users.json | User roles/approvals | ✅ |
| payments.json | Payment transactions | ✅ |
| pending_doctors.json | Doctor invitations | ✅ |
| masterdata.json | Platform configuration | ✅ |

### 10.2 /clear Command Preservation

| Preserved | Reset |
|-----------|-------|
| patientProfile | flowState |
| media | consultationId |
| selectedPersona | paymentVerified |
| isCaregiver | pendingPayment |
| caregiver* fields | doctorId |

**Status:** ✅ VERIFIED

---

## 11. TEST EXECUTION RESULTS

### 11.1 Automated Tests

```
npm test
✓ normalizePhone removes non-digits and +91 prefix
✓ normalizePhone handles null/empty
✓ normalizePhoneStrict removes + and spaces
3 tests passed
```

### 11.2 Syntax Verification

```
node -e "require('./src/servers/telegramBot.js')"
No errors - Module loads successfully
```

**Status:** ✅ PASS

---

## 12. REQUIRED ACTIONS

### 12.1 Immediate Actions

| Priority | Action | Owner | Due |
|----------|--------|-------|-----|
| HIGH | Restart bot to trigger ensureEnvSeededAdminRecord | Admin | Now |
| HIGH | Verify admin record created in admins.json | Admin | Now |
| MEDIUM | Complete super admin profile (option 5) | Super Admin | After restart |

### 12.2 Testing Actions

| Priority | Action | Owner | Due |
|----------|--------|-------|-----|
| HIGH | Run ONB-001: Super Admin onboarding | Tester | Next |
| HIGH | Run CONS-001: Full consultation flow | Tester | Next |
| HIGH | Run PAY-001: Payment verification | Tester | Next |
| MEDIUM | Run INT-001: Integrated scenario | Tester | Next |
| LOW | Run EDGE-001: Invalid inputs | Tester | Next |

---

## 13. RISK ASSESSMENT

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Env-seeded admin lockout | HIGH | CRITICAL | ✅ Fix applied |
| Payment gateway failure | MEDIUM | HIGH | Requires external testing |
| Doctor notification failure | LOW | MEDIUM | Built-in retry logic |
| Session data loss | LOW | HIGH | JSON persistence |

---

## 14. RECOMMENDATIONS

1. **Immediate:** Restart bot server to activate env-seeded admin record creation
2. **Short-term:** Complete super admin profile via option 5 (Profile & Roles)
3. **Medium-term:** Test end-to-end consultation flow with real doctor notification
4. **Long-term:** Implement automated integration tests using mocked Telegram API

---

## 15. CONCLUSION (superseded - see Section 16)

~~The codebase is **production-ready** with the fix for env-seeded admin
onboarding applied. All automated tests pass.~~ This conclusion was reached
via static review and was materially wrong: the consultation/payment
lifecycle (the core business flow this bot exists to run) could not have
completed end-to-end. See Section 16 for what live execution actually found
and fixed.

---

## 16. LIVE-EXECUTION FINDINGS (post-audit)

Executed `DETAILED_TEST_PLAN.md` in full (all 9 phases, 52 assertions)
against a mocked Telegram client driving real `bot.processUpdate()` calls
with the plan's own test data - not by reading the source and inferring it
should work. Three real, chained bugs surfaced that this audit's static
methodology had marked ✅ PASS:

1. **`ADMIN_PHONES` never actually recognized by role routing** (Section
   4.2) - fixed in `models/persona.js`.
2. **"Request Payment Link" never created a payment transaction** (Section
   6.1/7.1) - fixed in `services/conversationFlow.js`.
3. **Nothing ever created an actual Consultation record from the
   patient-facing flow, even after payment verification** (Section 6.1) -
   fixed in `services/conversationFlow.js`.
4. **The assigned doctor was never notified on initial assignment** (Section
   6.2) - fixed in `src/servers/telegramBot.js`.

All 52 assertions across onboarding, role approval, the full
consultation/payment/doctor-assignment/closure lifecycle, offboarding, role
switching, and edge cases pass after these fixes. See
`DETAILED_TEST_PLAN.md` Section 15 for the full pass/fail breakdown and
`TEST_REPORT.md` Section 15 for the broader regression checklist covering
fixes from earlier in the same session.

**Lesson for future audits of this codebase:** a handler function existing
at a cited line number is not evidence it is ever called. Verify
reachability (grep for callers, check what states actually transition into
a given FlowState) and, where possible, actually execute the flow rather
than reading it.

---

*Report generated by Kilo AI Audit System. Section 16 and inline corrections added after live-execution testing found the original conclusion materially incorrect.*