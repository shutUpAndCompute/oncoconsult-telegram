# Complete Telegram Bot Testing Report

> **See `TEST_REPORT.md` Section 15 for the full, verified changelog of every
> bug found and fixed against this path tracing** (menu invalid-input
> handling, role-switching/session leaks, a critical admin lockout, doctor
> "Message Admin" being fully broken, data corruption repair, and crash
> resilience). Paths below marked `[FIXED - ...]` reflect current (fixed)
> behavior; anything not so marked was verified accurate as originally
> written. There are now 36 FlowStates (`DATA_SHARING_CONSENT` was confirmed
> dead code and removed).

## Executive Summary
All 36 FlowStates are defined and reachable. Path tracing shows comprehensive coverage with the following key findings:

---

## 1. ALL PATHS BY ROLE

### PATIENT Role - COMPLETE PATH TRACING

#### Onboarding Flow (69 distinct transitions)
```
/start [new user]
├─ No phone & !mobileSkipped & !isAdmin → MOBILE_COLLECTION
│  ├─ "SKIP" → ROLE_SELECT
│  ├─ 10-digit phone → ROLE_SELECT (with phone stored)
│  └─ Other → MOBILE_COLLECTION (re-prompt)
└─ Has phone → PLATFORM_TERMS (if !platformTermsAccepted)
   ├─ Selection "1" → ROLE_SELECT
   ├─ Selection "2" or "cancel" → WELCOME + reset
   └─ Other → PLATFORM_TERMS (re-prompt)

ROLE_SELECT:
├─ "0" or "cancel" → WELCOME
├─ "1" → startPatientProfile → PROFILE:name
├─ "2" → CAREGIVER_AUTH
├─ "3" → startDoctorProfile → PROFILE:doctor_name
└─ Other → ROLE_SELECT (re-prompt)

PROFILE:name → PROFILE:age → PROFILE:gender → PROFILE:address → PROFILE:pincode
   ↓
PROFILE:state → PROFILE:cancer_type → PROFILE:diagnosis_date → PROFILE:oncologist_name
   ↓
PROFILE:treating_hospital → PROFILE:treatment_status → PROFILE:medical_reports
   ↓
PROFILE:emergency_contact_name → PROFILE:emergency_contact_number
   ↓
PROFILE:emergency_contact_relation
   ├─ Caregiver without linkedPatientPhone → CAREGIVER_PATIENT_LINK
   ├─ Caregiver with linkedPatientPhone → CAREGIVER_CONSENT_ACK
   └─ Patient → PROFILE_CONSENTS

PROFILE_CONSENTS:
├─ "1"/"2"/"3" → Confirm respective consent → (re-show if not all done) → PROFILE_CONSENTS
├─ All 3 confirmed → WELCOME
└─ "cancel" → WELCOME + reset

WELCOME:
├─ "1" → CONSULTATION (blocked if !profileComplete || !consentsConfirmed)
├─ "2" → PROFILE_VIEW
├─ Other → Re-show WELCOME

CONSULTATION:
├─ "1" → handleStartConsultation
│  ├─ !cancerType → CANCER_TYPE
│  ├─ !reports → REPORT_UPLOAD
│  └─ Has both → BILLING
├─ "2" → handlePaymentStatusCheck
│  ├─ !paymentTransaction → CONSULTATION error
│  ├─ feePending → CONSULTATION pending message
│  ├─ verified → CONSULTATION success
│  └─ !verified → CONSULTATION pending
├─ "3" → handleWithdrawalRequest → CONSULTATION_WITHDRAW
├─ "4" → WELCOME (Back to Menu)
└─ Other → CONSULTATION (re-prompt) [FIXED - previously fell through to WELCOME like "4"]

CANCER_TYPE:
├─ "0" → WELCOME
├─ "1"-"8" → BILLING (with respective cancerType)
└─ Other → CANCER_TYPE (re-prompt)

BILLING:
├─ "1" → PAYMENT_PENDING
├─ "2" → WELCOME (Back to Menu)
├─ "3" → PROFILE_DISCOUNT_CATEGORY
└─ Other → BILLING (re-prompt) [FIXED - previously fell through to WELCOME like "2"]

PROFILE_DISCOUNT_CATEGORY:
├─ "0" → BILLING
├─ "1"-"18" → PROFILE_DISCOUNT_DOCUMENTS (with category)
├─ "19" → BILLING (no discount)
└─ Other → PROFILE_DISCOUNT_CATEGORY (re-prompt)

PROFILE_DISCOUNT_DOCUMENTS:
├─ "0" or "skip" → BILLING
└─ File/photo upload → Continue

CONSENTS (handleProfileConsentsSelection):
├─ "1"/"2"/"3" → Set respective consent
├─ All confirmed → WELCOME
└─ "cancel" → WELCOME + reset
```

### CAREGIVER Role - COMPLETE PATH TRACING

```
CAREGIVER_AUTH:
├─ "0" → ROLE_SELECT
├─ "1" → PROFILE:caregiver_info (isCaregiver=true)
├─ "2" → startPatientProfile → PROFILE:name
└─ Other → CAREGIVER_AUTH (re-prompt) [FIXED - previously silently treated as "2"]

CAREGIVER_CONSENT_ACK:
├─ "1" → Set all consents + caregiverConsentGiven → CAREGIVER_PATIENT_LINK
└─ Other → caregiverConsentGiven=true → CAREGIVER_PATIENT_LINK

CAREGIVER_PATIENT_LINK:
├─ "0" → WELCOME
├─ Invalid format → CAREGIVER_PATIENT_LINK (re-prompt)
└─ 10-digit phone → CAREGIVER_MENU (with linked patient)

CAREGIVER_MENU:
├─ "1" → CONSULTATION
├─ "2" → PROFILE_VIEW
└─ "0" → WELCOME
```

### DOCTOR Role - COMPLETE PATH TRACING

```
DOCTOR_MENU:
├─ "1" → handleDoctorStatus → DOCTOR_MENU (show status)
├─ "2" → handleViewLinkedPatients → DOCTOR_MENU (show patients)
├─ "3" → DOCTOR_PROFILE_EDIT
├─ "4" → DOCTOR_MSG_ADMIN_INPUT
└─ "0" → PERSONA_SELECT

DOCTOR_PROFILE_EDIT:
├─ "menu" or "0" → DOCTOR_MENU
├─ FIELD:VALUE → DOCTOR_MENU (update)
└─ No valid → DOCTOR_PROFILE_EDIT (re-prompt)

DOCTOR_MSG_ADMIN_INPUT:
├─ "menu" or "0" → DOCTOR_MENU
└─ Message → DOCTOR_MENU (forward)

handleDoctor (outside domain):
├─ MSG_ADMIN <msg> → Forward to admin
├─ CLOSE <id> → Close consultation
├─ !consultation → Error "No active consultation"
├─ !profileComplete → Error "Profile incomplete"
├─ !paymentVerified → Error "Payment required"
└─ Valid → Forward to patient
```

### ADMIN Role - COMPLETE PATH TRACING

```
ADMIN_MENU:
├─ !isAdmin → WELCOME (error)
├─ !adminProfileComplete && !"5" && !"0" → ADMIN_MENU (blocked with error)
├─ "1" → getPendingRequests → ADMIN_MENU
├─ "2" → getActiveConsultations → ADMIN_MENU
├─ "3" → ADMIN_ROLE_APPROVALS
├─ "4" → ADMIN_DOCTOR_MANAGEMENT
├─ "5" → PROFILE_VIEW
├─ "6" → viewAllPatients (super_admin only) → ADMIN_MENU
├─ "7" → ADMIN_VERIFY_PAYMENT_INPUT
├─ "8" → ADMIN_VERIFY_DISCOUNT_INPUT
├─ "9" → ADMIN_MESSAGE_PATIENT_INPUT
├─ "10" → ADMIN_CLOSE_CONSULTATION
├─ "11" → ADMIN_ADD_ADMIN_INPUT (super_admin only)
├─ "12" → ADMIN_REMOVE_ADMIN_INPUT (super_admin only)
├─ "0" → PERSONA_SELECT
└─ Other → ADMIN_MENU (re-show)

ADMIN_ROLE_APPROVALS:
├─ "1" → getDoctorApplications → ADMIN_ROLE_APPROVALS (super_admin)
├─ "2" → ADMIN_APPROVE_DOCTOR_INPUT
├─ "3" → ADMIN_APPROVE_CAREGIVER_INPUT
├─ "4" → ADMIN_APPROVE_SUPPORT_INPUT
└─ "0" → ADMIN_MENU

ADMIN_DOCTOR_MANAGEMENT:
├─ "1" → listDoctors → ADMIN_DOCTOR_MANAGEMENT
├─ "2" → listPendingDoctors → ADMIN_DOCTOR_MANAGEMENT
├─ "3" → ADMIN_ASSIGN_DOCTOR_INPUT
├─ "4" → ADMIN_REASSIGN_DOCTOR_INPUT
├─ "5" → ADMIN_REMOVE_DOCTOR_INPUT (super_admin)
├─ "6" → ADMIN_REJECT_DOCTOR_INPUT (super_admin)
├─ "7" → ADMIN_MESSAGE_DOCTOR_INPUT
├─ "8" → ADMIN_REGISTER_DOCTOR_INPUT
├─ "9" → ADMIN_INVITE_DOCTOR_INPUT
└─ "0" → ADMIN_MENU
```

### SUPPORT Role - COMPLETE PATH TRACING

```
SUPPORT_MENU:
├─ "1" → getActiveConsultationsForSupport → SUPPORT_MENU
├─ "2" → ADMIN_MESSAGE_DOCTOR_INPUT
├─ "3" → ADMIN_MESSAGE_PATIENT_INPUT
├─ "4" → PROFILE_VIEW
└─ "0" → WELCOME
```

---

## 2. PROFILE COMPLETENESS CHECKS

### Patient Profile (isProfileComplete, line 1117-1126)
Required: name, age, gender, address, state, cancerType, treatingHospital, treatmentStatus, emergencyContactName, emergencyContactNumber, emergencyContactRelation + 3 consents

### Doctor Profile (isDoctorProfileComplete, line 1128-1133)
Required: name, specialty, cancerTypes.length > 0

### Admin Profile (isAdminProfileComplete)
Required: name, phoneNumber

---

## 3. DATA PERSISTENCE ANALYSIS

### /clear Preservation:
Preserved: patientProfile, media, isCaregiver, caregiver* fields
Reset: flowState→WELCOME, consultationId, payment*, ends consultations

---

## 4. STATE TRANSITION VERIFICATION

### Role Domain Guards (telegramBot.js):
- ADMIN_DOMAIN_STATES: Auto-route to ADMIN_MENU if drifted (now includes `ADMIN_PROFILE_EDIT`, previously missing - was causing a real bug, see TEST_REPORT.md 15.4)
- SUPPORT_DOMAIN_STATES: Auto-route to SUPPORT_MENU if drifted
- DOCTOR_DOMAIN_STATES: **new set** - `DOCTOR_MENU`/`DOCTOR_PROFILE_EDIT`/`DOCTOR_MSG_ADMIN_INPUT` excluded from the MSG_ADMIN/CLOSE/forward-to-patient catch-all (previously only `DOCTOR_MENU` itself was excluded, so Edit Profile/Message Admin replies got misrouted)
- SHARED_DOMAIN_STATES: Never auto-healed (PROFILE_VIEW, PROFILE_EDIT, PROFILE_REMOVE_ROLE, ROLE_APPLICATION, PERSONA_SELECT)

---

## 9. COMMAND-MENU PARITY REQUIREMENT

### Requirement: ALL SLASH COMMANDS MUST HAVE CORRESPONDING MENU ITEM

Every command available via slash should have an equivalent menu pathway. Menu options may be reached via state that commands can also access.

| Command | Equivalent Menu Path | State Used | Status |
|---------|---------------------|------------|--------|
| /start | Entry point (no menu) | All role entry points | ✓ Entry only |
| /clear | Exit path only | N/A | ✓ Exit only |
| /resume | N/A (resume helper) | N/A | ✓ Helper only |
| /menu | All role menus (option 0/return) | WELCOME, CAREGIVER_MENU, DOCTOR_MENU, ADMIN_MENU, SUPPORT_MENU | ✓ Verified |
| /profile | PROFILE_VIEW (option 2) | PROFILE_VIEW | ✓ Verified |
| /apply | ROLE_APPLICATION (option 3) | ROLE_APPLICATION | ✓ Verified |
| /roles | PROFILE_VIEW (option 4) | PROFILE_VIEW | ✓ Verified |
| /feebased | ADMIN_VERIFY_PAYMENT_INPUT | N/A | ⚠️ No direct menu equivalent |
| /accept | ADMIN_INVITE_DOCTOR_INPUT | N/A | ⚠️ No direct menu equivalent |

### Commands Without Menu Equivalents (Acceptable for Admin Tools)
- `/feebased` - Admin-only fee setting (no patient menu equivalent needed)
- `/accept` - Doctor invitation acceptance (one-time action)

### Missing Menu Items to Add:
1. [ ] Consider adding "Set Fee" option in admin payment flow  
2. [ ] Consider adding "Accept Invitation" in doctor registration flow

---

## 10. TEST SCENARIOS TO VERIFY

### Critical Path Tests:
1. [ ] Patient: Fresh /start → Profile complete → Consultation → Payment → Doctor assigned
2. [ ] Patient: Cancel at any profile step → Doctor released, session reset
3. [ ] Caregiver: Auth → Patient link → Complete linked patient profile → Consultation
4. [ ] Doctor: Profile incomplete → Messaging blocked → Complete → Allowed
5. [ ] Admin: Incomplete profile → Menu options blocked → Complete → All work
6. [ ] Support: My consults → Doctor chat → Patient chat → Profile
7. [ ] Super Admin: All admin + view patients + add/remove admins + approve roles
8. [ ] /clear → Profile preserved → /start shows correct state
9. [ ] Role switch: Patient ↔ Doctor ↔ Admin (all paths)
10. [ ] Discount flow: Select category → Upload doc → Admin verify

### Edge Cases:
1. [ ] Invalid menu selection at any state → Re-show menu
2. [ ] Doctor messages from non-domain state → Handled by handleDoctor
3. [ ] Idle session (30 min) → Auto-reset to WELCOME
4. [ ] Multiple admins approve same role → Idempotent
5. [ ] Remove doctor with active consultations → Blocked
6. [ ] Close already-closed consultation → Blocked
7. [ ] Upload document when not in discount flow → Goes to report upload
8. [ ] Consultation withdrawal with no consultation → Blocked

---

## 11. SUMMARY

### States Covered: 36/36
`DATA_SHARING_CONSENT` was confirmed genuinely dead (nothing ever transitioned
into it) and removed entirely - see TEST_REPORT.md 15.4/15.5. All remaining
FlowStates are reachable through various paths.

### Transitions Covered: All major branches traced and, as of this pass,
verified via an AST checker that every `conversationFlow.js` dispatch method
returns a result on every code path (88 methods, zero gaps) - not just
inspected by reading.

### Guard Checks Implemented:
- Profile completeness before consultation (now correctly uses the *linked
  patient's* profile when the acting user is a caregiver, not the caregiver's
  own - previously always blocked Switch-Role caregivers)
- Admin profile before admin actions (the completeness gate itself was fixed
  after it was found to permanently lock out every env-seeded admin - see
  TEST_REPORT.md 15.4 #1, critical)
- Doctor profile before patient messaging
- Consultation state validation for uploads
- Role-based state domain enforcement (now covers `ADMIN_PROFILE_EDIT` and
  the new `DOCTOR_DOMAIN_STATES` set, both previously missing)

### Previously "Missing Coverage" - resolved:
- ~~DATA_SHARING_CONSENT state (legacy, superseded)~~ - confirmed dead, removed
- ADMIN_FALLBACK notification - not re-investigated this pass, left as-is
- ~~Some invalid input branches just re-show menu without explicit error~~ -
  the ones that were actually missing it (`handleCaregiverAuthSelection`,
  `handleConsultationMenuSelection`, `handleBillingSelection`) now do; see
  TEST_REPORT.md Section 15.1 for the full list with test steps.