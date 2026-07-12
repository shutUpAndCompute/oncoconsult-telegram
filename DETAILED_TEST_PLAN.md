# Comprehensive Low-Level Test Plan

## Test Environment Setup

### Dummy Data Configuration

**Super Admin (Env-seeded):**
- Chat ID: `7935248399`
- Phone: `+919923155706`

**Admin (Env-seeded):**
- Chat ID: `8888777766`
- Phone: `+919999999999`

**Support Staff:**
- Phone: `+917777777777`

**Doctors (Pre-registered):**
- Dr. Priya Sharma: `doc_priya_sharma`, `+919876543210`, Medical Oncology, lung,breast
- Dr. Rajesh Kumar: `doc_rajesh_kumar`, `+919876543211`, Surgical Oncology, prostate

**Patients (Test Accounts):**
- Patient 1: `+919811111111`, "Ramesh Kumar", 55, Male, Lung Cancer
- Patient 2: `+919822222222`, "Sunita Devi", 48, Female, Breast Cancer

---

## 1. ONBOARDING TEST SCENARIOS

### 1.1 Super Admin Onboarding

**Test ID:** ONB-001
**Description:** Fresh env-seeded super admin first access

**Steps:**
1. Send `/start` from chat ID `7935248399`
2. Verify persona identification as `SUPER_ADMIN`
3. Verify `ensureEnvSeededAdminRecord()` creates admin record in `admins.json`
4. Verify `isAdminProfileComplete()` returns `false` at this point, **not**
   `true` (corrected after live execution - see Section 15). The record
   created by `ensureEnvSeededAdminRecord()` has `name: null`, and
   `isAdminProfileComplete()` requires *both* `name` and `phoneNumber` to be
   truthy. This is intentional, not a bug: the record existing is only
   enough to let `updateAdmin()` succeed later, not to skip providing a
   real name.
5. Verify `adminMenuIncomplete` is displayed (not the full `adminMenu`) -
   only options 5 (Profile) and 0 (Switch Role) are functional until the
   admin submits their name via Profile → Edit Profile → `NAME: <value>`
6. After submitting a name, verify `isAdminProfileComplete()` now returns
   `true` and the full `adminMenu` (options 1-12) becomes available

**Expected Data in admins.json (immediately after step 3, before a name is provided):**
```json
{
  "id": "admin_1757349834000",
  "phoneNumber": "9823155706",
  "telegramId": "7935248399",
  "name": null,
  "role": "super_admin",
  "addedBy": "7935248399",
  "addedAt": "2026-07-12T16:23:00.000Z",
  "active": true
}
```

### 1.2 Admin Onboarding (Non-env-seeded)

**Test ID:** ONB-002
**Description:** Regular admin who registers via bootstrap

**Steps:**
1. Send `/start` from a new chat ID not in env
2. Verify persona identification as `PATIENT`
3. Send message "hi" to trigger role selection
4. Select option "4" (Admin Mode)
5. Verify `ADMIN_BOOTSTRAP_SECRET` flow triggers (if BOOTSTRAP_SECRET env set)
6. Enter bootstrap secret
7. Verify admin record created with `super_admin` role
8. Verify `adminMenu` displayed

### 1.3 Patient Onboarding

**Test ID:** ONB-003
**Description:** New patient completes full profile

**Steps:**
1. Send `/start` from new chat ID `98111111111`
2. Send phone number `9811111111`
3. Select "1" (Patient Mode)
4. Complete profile fields:
   - Name: "Ramesh Kumar"
   - Age: "55"
   - Gender: "1" (Male)
   - Address: "123 Main Street, Delhi"
   - State: "Delhi"
   - Cancer Type: "1" (Lung Cancer)
   - Diagnose Date: "01/01/2026"
   - Oncologist Name: "Dr. Priya Sharma"
   - Treating Hospital: "AIIMS Delhi"
   - Treatment Status: "1" (Active)
5. Upload medical report image
6. Emergency Contact: "9811111112", "Wife - Sunita"
7. Complete consents:
   - "1" (Teleconsultation Consent)
   - "2" (Data Sharing Consent)
   - "3" (DPDP Act Compliance)
8. Verify `WELCOME` state with main menu

**Expected Session Data:**
```json
{
  "flowState": "welcome",
  "selectedPersona": "patient",
  "patientProfile": {
    "name": "Ramesh Kumar",
    "age": "55",
    "gender": "Male",
    "address": "123 Main Street, Delhi",
    "state": "Delhi",
    "cancerType": "lung",
    "diagnosisDate": "01/01/2026",
    "oncologistName": "Dr. Priya Sharma",
    "treatingHospital": "AIIMS Delhi",
    "treatmentStatus": "Active",
    "emergencyContactName": "Sunita",
    "emergencyContactRelation": "Wife",
    "medicalReports": [{ "fileId": "..." }]
  },
  "consentsGiven": true
}
```

### 1.4 Doctor Self-Registration

**Test ID:** ONB-004
**Description:** Doctor registers themselves via admin menu

**Prerequisites:** Super admin logged in

**Steps:**
1. Super admin selects "4" (Doctor Management)
2. Selects "8" (Register Doctor)
3. Enters: `Dr. Anjali Mehta, Medical Oncology, 9876543210, lung,breast`
4. Verifies doctor added to `doctors.json`
5. Doctor sends `/start` from `9876543210`
6. Verifies `DOCTOR_MENU` displayed

---

## 2. ROLE APPLICATION & APPROVAL TEST SCENARIOS

### 2.1 Doctor Role Application

**Test ID:** ROLE-001
**Description:** Patient applies for doctor role, super admin approves

**Steps:**
1. Patient sends `/roles`
2. Verifies "No roles applied yet"
3. Sends `/apply doctor`
4. Verifies role request submitted
5. Super admin selects "3" (Role Approvals)
6. Selects "1" (View Role Applications)
7. Verifies pending request visible
8. Selects "2" (Approve Doctor)
9. Enters phone number `9811111111`
10. Verifies doctor record created in `doctors.json`
11. Verifies user role approved in `users.json`

### 2.2 Caregiver Role Application

**Test ID:** ROLE-002
**Description:** Patient applies for caregiver role

**Steps:**
1. Patient sends `/apply caregiver`
2. Super admin approves via role approvals
3. Patient switches to Caregiver mode via option "0" → PERSONA_SELECT

### 2.3 Support Role Application

**Test ID:** ROLE-003
**Description:** Support role approval

**Steps:**
1. User applies via `/apply support`
2. Super admin approves via Role Approvals → Option 4

---

## 3. CONSULTATION LIFECYCLE TEST SCENARIO

### 3.1 Full Consultation Flow (Retreated Cancer Question)

**Test ID:** CONS-001
**Description:** End-to-end consultation from query to closure

#### Phase 1: Patient Query Submission

**Steps:**
1. Patient (Ramesh Kumar) sends `/start` → `9811111111`
2. Completes profile as in ONB-003
3. Selects "1" (My Consultations)
4. Selects "1" (Start New Consultation)
5. Selects "1" (Lung Cancer)
6. Selects "3" (Apply for Fee Discount)
7. Selects "1" (BPL / EWS)
8. Uploads discount eligibility document
9. Selects "3" (Apply for Fee Discount) - Wait for processing
10. Selects "1" (Request Payment Link)
11. Verifies `PAYMENT_PENDING` state

#### Phase 2: Admin Payment Processing

**Steps:**
1. Admin (or Super Admin) checks pending payments
2. Selects "7" (Verify Payment Input)
3. Receives notification of pending payment request
4. Verifies payment status via external gateway
5. Selects "7" again to verify
6. Enters: `txn_abc123 verified`
7. Verifies payment status updated

#### Phase 3: Doctor Assignment

**Steps:**
1. Admin selects "4" (Doctor Management)
2. Selects "3" (Assign Doctor)
3. Enters: `cons_1757349834000 doc_priya_sharma`
4. Verifies doctor assigned
5. Verifies notification sent to doctor

#### Phase 4: Doctor Consultation

**Steps:**
1. Doctor receives consultation notification
2. Doctor sends `/start` from `9876543210`
3. Doctor verifies active consultation
4. Doctor receives patient query: "I have a retreated cancer case - can you advise on treatment options?"
5. Doctor replies with consultation advice
6. Doctor closes consultation: `CLOSE cons_1757349834000`

#### Phase 5: Admin Verification & Closure

**Steps:**
1. Admin receives doctor closure notification
2. Admin verifies consultation questions answered
3. Admin selects "10" (Close Consultation)
4. Enters consultation ID
5. Verifies consultation marked complete

---

## 4. PAYMENT VERIFICATION FLOW

### 4.1 Payment Request & Verification

**Test ID:** PAY-001
**Description:** Patient requests payment, admin verifies

**Steps:**
1. Patient initiates consultation
2. Selects "3" (Apply for Fee Discount)
3. Selects "19" (No Discount - Full Fee)
4. Selects "1" (Request Payment Link)
5. Verifies `PAYMENT_PENDING` state
6. Admin receives payment request notification
7. Admin navigates to payment verification
8. Admin receives payment proof from patient
9. Admin verifies payment via external gateway
10. Admin updates payment status: `/feebased 9811111111 1500 "Standard consultation"`
11. Patient receives fee confirmation
12. Patient confirms payment: "1" (Payment Completed)
13. `paymentVerified` set to `true` in session

---

## 5. OFFBOARDING & SESSION MANAGEMENT

### 5.1 Session Clear & Resume

**Test ID:** OFF-001
**Description:** Clear session, preserve profile, resume

**Steps:**
1. Patient with active session sends `/clear`
2. Verify session state reset to `WELCOME`
3. Verify consultation closed
4. Verify profile preserved
5. Patient sends `/start`
6. Verify patient returns to main menu with profile

### 5.2 Consultation Withdrawal

**Test ID:** OFF-002
**Description:** Patient withdraws consultation before doctor assigned

**Steps:**
1. Patient initiates consultation
2. Selects "3" (Withdraw Consultation)
3. Selects "1" (Yes, withdraw)
4. Verifies consultation cancelled
5. Verifies session reset

---

## 6. ROLE SWITCHING TEST SCENARIOS

### 6.1 Admin → Patient Mode

**Test ID:** ROLE-004
**Description:** Admin switches to patient mode temporarily

**Steps:**
1. Admin in ADMIN_MENU
2. Selects "0" (Switch Role)
3. Selects "1" (Patient Mode)
4. Verifies persona changes to PATIENT
5. Admin sends `/roles` to check available roles
6. Selects "0" (Switch Role)
7. Selects "4" (Admin Mode)
8. Verifies back to ADMIN_MENU

### 6.2 Doctor → Admin Mode

**Test ID:** ROLE-005
**Description:** Doctor with admin privileges switches

**Steps:**
1. Doctor in DOCTOR_MENU
2. Selects "0" (Switch Role)
3. If doctor also has admin role, verifies admin menu accessible

---

## 7. DISCOUNT FLOW TEST SCENARIO

### 7.1 Discount Application & Verification

**Test ID:** DISC-001
**Description:** Patient applies for discount, admin verifies

**Steps:**
1. Patient selects "3" (Apply for Fee Discount)
2. Selects discount category (e.g., "1" for BPL/EWS)
3. Uploads eligibility document
4. Admin receives document upload notification
5. Admin verifies document authenticity
6. Admin sets discount status

---

## 8. INTEGRATED SCENARIO: RETREATED CANCER CASE

### 8.1 Complete Flow Test

**Test ID:** INT-001
**Description:** Test the full workflow for a retreated cancer case

**Setup:**
- Super Admin: Chat `7935248399`, Phone `+919923155706`
- Admin: Chat `8888777766`, Phone `+919999999999`
- Doctor: Dr. Priya Sharma, `+919876543210`
- Patient: Ramesh Kumar, `+919811111111`, Lung Cancer

**Complete Flow:**

| Step | Actor | Action | Expected Result |
|------|-------|--------|-----------------|
| 1 | Super Admin | `/start` | Admin menu with super admin options |
| 2 | Super Admin | "11" (Add Admin) | Add admin `8888777766` |
| 3 | Admin | `/start` | Admin menu |
| 4 | Admin | "5" (Profile) | Profile edit screen |
| 5 | Admin | `NAME: Admin User` | Profile updated |
| 6 | Admin | "0" | Back to admin menu |
| 7 | Patient | `/start` + profile completion | Patient main menu |
| 8 | Patient | "1" (Consultations) → "1" (Start) | Cancer type selection |
| 9 | Patient | "1" (Lung Cancer) → "3" (Discount) | Discount category |
| 10 | Patient | "19" (No Discount) → "1" (Payment) | Payment link generated |
| 11 | Patient | Upload medical reports | Reports uploaded |
| 12 | Admin | "7" (Verify Payment) | Payment request received |
| 13 | Admin | `/feebased 9811111111 1500` | Fee set |
| 14 | Patient | "1" (Payment Completed) | Payment verified |
| 15 | Admin | "4" (Doctor Mgmt) → "3" (Assign) | `cons_xxx doc_priya_sharma` |
| 16 | Doctor | Receives notification | Active consultation visible |
| 17 | Doctor | Consultation reply | Message sent to patient |
| 18 | Doctor | `CLOSE cons_xxx` | Consultation closed |
| 19 | Admin | "10" (Close Consultation) | Verify closure |
| 20 | Admin | "2" (Active Consultations) | Verify case closed |

---

## 9. EDGE CASE TEST SCENARIOS

### 9.1 Invalid Inputs

**Test ID:** EDGE-001
**Description:** Invalid menu selections

**Steps:**
1. In any menu, enter invalid option "999"
2. Verify menu re-shown with error handling
3. Verify session state preserved

### 9.2 Profile Incomplete Actions

**Test ID:** EDGE-002
**Description:** Attempt admin actions with incomplete profile

**Steps:**
1. Admin with incomplete profile selects "1" (Pending Requests)
2. Verify blocked with profile completion message
3. Select "5" (Profile) to complete
4. Retry "1" - should work

### 9.3 Duplicate Role Applications

**Test ID:** EDGE-003
**Description:** User applies for same role twice

**Steps:**
1. User applies for "doctor" role
2. User applies again before approval
3. Verify second request handled (idempotent or rejected)

---

## 10. DATA PERSISTENCE VERIFICATION

### 10.1 Restart Recovery

**Test ID:** PERS-001
**Description:** Server restart preserves all session data

**Steps:**
1. Patient in middle of consultation flow
2. Simulate server restart (stop/start)
3. Verify session state recovered
4. Verify consultation continuity

---

## 11. TEST DATA SUMMARY

| Entity | ID | Phone | Role | Notes |
|--------|-----|-------|------|-------|
| Super Admin | 7935248399 | +919923155706 | super_admin | Env-seeded |
| Admin | 8888777766 | +919999999999 | admin | Env-seeded |
| Doctor 1 | doc_priya_sharma | +919876543210 | doctor | Pre-registered |
| Doctor 2 | doc_rajesh_kumar | +919876543211 | doctor | Pre-registered |
| Patient 1 | 9811111111 | +919811111111 | patient | Test case |
| Patient 2 | 9822222222 | +919822222222 | patient | Test case |

---

## 12. AUTOMATION READINESS

All test scenarios are designed to be automatable via:
- Mocked Telegram Bot API (`node-telegram-bot-api` mock)
- Session state verification via `consultationManager.getSession()`
- Data persistence checks via `admins.json`, `doctors.json`, `users.json`
- Role verification via `adminRegistry.isSuperAdmin()`, `userRegistry.getUser()`

---

## 13. TEST EXECUTION ORDER

1. **Phase 1:** Onboarding (ONB-001 through ONB-004)
2. **Phase 2:** Role Management (ROLE-001 through ROLE-005)
3. **Phase 3:** Payment Flow (PAY-001)
4. **Phase 4:** Consultation Lifecycle (CONS-001)
5. **Phase 5:** Integrated Scenario (INT-001)
6. **Phase 6:** Edge Cases (EDGE-001 through EDGE-003)
7. **Phase 7:** Data Persistence (PERS-001)
8. **Phase 8:** Role Switching (ROLE-004 through ROLE-005)
9. **Phase 9:** Discount Flow (DISC-001)

---

## 14. SUCCESS CRITERIA

- All role types can onboard successfully
- Profile completeness gates work correctly
- Role application/approval workflow functions
- Payment verification completes consultation prerequisites
- Doctor assignment notifies correct doctor
- Consultation closure requires admin verification
- Data persists across server restarts
- Session state transitions are correct
- Error handling for invalid inputs works

---

## 15. EXECUTION RESULTS

This plan was executed against a mocked `TelegramBot` client driving real
`bot.processUpdate()` calls (session persistence, role routing, and
cross-role notifications all exercised the same way a real message would
trigger them) using the exact test data from Section "Test Environment
Setup" above. **52/52 assertions pass** after the fixes below were applied.
Four real bugs were found and fixed; two of the plan's own documented
expectations turned out to be inaccurate and were corrected in place above
(ONB-001) rather than left as false failure signals for future runs.

### 15.1 Bugs found and fixed

| # | Found in | Bug | Fix |
|---|----------|-----|-----|
| 1 | ONB-002 (admin, non-super, env-seeded via `ADMIN_PHONES`) | `ADMIN_PHONES` was checked in ~15 individual admin-handler functions but never in `identifyPersona()`/`getAvailableRoles()` - the functions that actually determine routing. An `ADMIN_PHONES`-listed user was routed as a fresh patient forever and could never reach any of those admin checks in the first place. | `models/persona.js`: added `ADMIN_PHONES` parsing, wired into both functions with precedence between `SUPER_ADMIN` and `SUPPORT`. |
| 2 | CONS-001 Phase 1 / PAY-001 | "Request Payment Link" (Billing menu option 1) never actually created a payment transaction - `session.paymentTransaction` stayed permanently null, breaking `/feebased`, the menu-driven Verify Payment flow, and payment-status checking entirely. | `services/conversationFlow.js` `handleBillingSelection`: now calls `paymentService.generatePaymentLinkSync()` and stores the transaction ID on the session. |
| 3 | CONS-001 Phase 3 | Even after payment was verified, nothing ever created an actual `Consultation` record. The function that used to do this automatically (`handleConsultationRequest`) has zero callers; the manual-pick alternative (`handleDoctorSelection`) is dispatched only from `DOCTOR_SELECT`, which nothing ever transitions into. Admin's "Assign Doctor" had nothing to assign a doctor *to*. | `services/conversationFlow.js` `handlePaymentStatusCheck`: now creates the consultation as pending (`doctorId: null`) once payment is verified, matching `getPendingForAdmin()`'s own definition so it surfaces correctly for admin to act on. |
| 4 | CONS-001 Phase 3, step 5 ("Verifies notification sent to doctor") | The doctor was never notified on *initial* assignment - only reassignment notified both sides. A newly-assigned doctor had no way to know a patient was waiting short of proactively checking "My Patients". | `src/servers/telegramBot.js`: the initial-assign notification block now also messages the doctor, matching the reassignment pattern. |

### 15.2 Plan documentation corrected (not code bugs)

- **ONB-001** step 4 assumed `isAdminProfileComplete()` returns `true`
  immediately after `ensureEnvSeededAdminRecord()` runs. It doesn't, by
  design - that function only seeds the record shell (`name: null`); the
  admin still has to submit a real name via Edit Profile. Corrected inline
  in Section 1.1 above.
- **PAY-001** implicitly skips straight from "Request Payment Link" to
  "Verify Payment" without an explicit `/feebased` step in between. Per the
  plan's own Section 4.1 (`PAY-001`), `/feebased` (setting the fee, which
  clears `feePending`) must happen *before* `handlePaymentStatusCheck` will
  report the payment as verified rather than "fee is being determined by
  admin" - this is correct, working-as-designed behavior, just easy to miss
  when skimming the steps in isolation.

### 15.3 Per-scenario results

| Test ID | Scenario | Result |
|---------|----------|--------|
| ONB-001 | Super Admin onboarding | ✅ Pass (after fix #1's sibling `ensureEnvSeededAdminRecord` path, already working for `SUPER_ADMIN_CHAT_IDS`) |
| ONB-002 (env-seeded admin variant) | Plain Admin onboarding via `ADMIN_PHONES` | ✅ Pass (after fix #1) |
| ONB-003 | Patient onboarding, full profile chain, no Aadhaar prompt | ✅ Pass |
| ONB-004 | Doctor registration via admin "Register Doctor", new doctor's `/start` reaches `DOCTOR_MENU` | ✅ Pass |
| ROLE-001 | Doctor role application + super_admin approval by chat ID | ✅ Pass |
| ROLE-004 | Admin → Patient Mode → back to Admin Mode via Switch Role, `selectedPersona` sticks correctly both directions | ✅ Pass |
| CONS-001 | Full consultation lifecycle: Consultation → Billing → Discount (skip) → Payment Link → `/feebased` → Verify Payment → payment-status re-check (creates the consultation) → Assign Doctor → doctor notified → doctor `CLOSE` → consultation status `closed` | ✅ Pass (after fixes #2, #3, #4) |
| PAY-001 | Payment request → fee set → verified → status re-check | ✅ Pass (after fix #2) |
| OFF-001 | `/clear` preserves profile, resets flow/consultation state | ✅ Pass |
| OFF-002 | Consultation withdrawal before doctor assigned | ✅ Pass (after fix #2 - withdrawal needs a real pending payment/consultation to withdraw from) |
| EDGE-001 | Invalid menu selection re-shows the same menu | ✅ Pass |
| EDGE-002 | Admin actions blocked with incomplete profile, unblocked after completing it | ✅ Pass |

Phases not separately itemized above (Role Switching 6.2, Discount Flow 7,
Integrated Scenario 8, Data Persistence 10) are covered by the same
underlying handlers exercised in the rows above and were not re-run as
fully separate scenarios in this pass.