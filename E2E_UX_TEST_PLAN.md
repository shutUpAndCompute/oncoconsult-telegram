# E2E UX / UI Test Plan — Cascading Indicators & Menu Navigation

> **Cross-references:**
> - Role menus and flows → [`ARCHITECTURE.md`](ARCHITECTURE.md), [`FLOW.md`](FLOW.md)
> - State machine coverage → [`FEATURE_MATRIX_ALL_STATES.md`](FEATURE_MATRIX_ALL_STATES.md), [`EXHAUSTIVE_TEST_MATRIX.md`](EXHAUSTIVE_TEST_MATRIX.md)
> - Indicator design spec → [`DESIGN_CASCADING_INDICATORS.md`](DESIGN_CASCADING_INDICATORS.md)
> - Navigation bug history → [`NAVIGATION_AUDIT_REPORT.md`](NAVIGATION_AUDIT_REPORT.md)
> - Low-level scenario steps → [`DETAILED_TEST_PLAN.md`](DETAILED_TEST_PLAN.md)
> - Command ↔ menu parity → [`COMMAND_MENU_MAPPING.md`](COMMAND_MENU_MAPPING.md)

---

## 1. Overview

This plan verifies **cascading 🔴 indicators** and **end-to-end menu navigation** for all
six user roles: Patient, Caregiver, Doctor, Support, Admin, Super Admin.

The indicator system follows a **single-indicator-per-context** rule: only the
*deepest* actionable item in the current workflow carries the 🔴 at any moment
(see [`DESIGN_CASCADING_INDICATORS.md §3.1`](DESIGN_CASCADING_INDICATORS.md)).

---

## 2. Test Environment Setup

### 2.1 Prerequisites

```bash
npm install

# Minimal env for test runs
export BOOTSTRAP_SECRET=test_secret
export SUPER_ADMIN_CHAT_IDS="7935248399"
export SUPER_ADMIN_PHONES="9923155706"
export ADMIN_PHONES="9999999999"
export SUPPORT_PHONES="7777777777"
```

> See [`DETAILED_TEST_PLAN.md §1`](DETAILED_TEST_PLAN.md) for full dummy-data
> values (chat IDs, phone numbers, pre-registered doctors).

### 2.2 Test Personas (from `DETAILED_TEST_PLAN.md §11`)

| Persona | Chat ID / Phone | Role | Notes |
|---------|----------------|------|-------|
| Super Admin | `7935248399` / `+919923155706` | super_admin | Env-seeded |
| Admin | `8888777766` / `+919999999999` | admin | Env-seeded |
| Support | — / `+917777777777` | support | Env-seeded |
| Doctor 1 | — / `+919876543210` | doctor | `doc_priya_sharma` |
| Doctor 2 | — / `+919876543211` | doctor | `doc_rajesh_kumar` |
| Patient 1 | — / `+919811111111` | patient | Ramesh Kumar, Lung |
| Patient 2 | — / `+919822222222` | patient | Sunita Devi, Breast |

### 2.3 Test Data Files

| File | Purpose |
|------|---------|
| `data/pending_doctors.json` | Doctor approval flows |
| `data/consultations.json` | Consultation lifecycle |
| `data/payments.json` | Payment indicator states |
| `data/users.json` | Role approvals |
| `data/sessions.json` | Session persistence |

### 2.4 Execution Commands

```bash
# Full suite
npm test

# Specific file
node --test test/comprehensive_audit.test.js

# Pattern filter
node --test --test-name-pattern="cascading" test/comprehensive_audit.test.js

# With coverage
npm run test:coverage
```

---

## 3. Indicator Design Contract

Before running tests, confirm these invariants hold
(from [`DESIGN_CASCADING_INDICATORS.md §3`](DESIGN_CASCADING_INDICATORS.md)):

| Rule | Description |
|------|-------------|
| Single indicator | Only ONE 🔴 shown per menu context at a time |
| Cascades inward | Indicator on deepest actionable item (Discount > Payment > Profile > Requests) |
| Auto-clears | Indicator disappears when action is completed |
| String responses | All menu handlers must return `string`, never a function reference |
| Invalid input stays | Invalid selection re-shows current menu with `❌ Invalid selection` |

---

## 4. Role-by-Role UX Tests

### 4.1 Patient Role

> Flow reference: [`FLOW.md §Patient Flow`](FLOW.md), [`ARCHITECTURE.md §Patient Persona`](ARCHITECTURE.md)

#### 4.1.1 Onboarding Gate (→ `DETAILED_TEST_PLAN.md ONB-003`)

| Step | Action | Expected |
|------|--------|----------|
| 1 | `/start` from new chat ID | `MOBILE_COLLECTION` → phone prompt |
| 2 | Enter 10-digit phone | `PLATFORM_TERMS` shown |
| 3 | Accept terms (`1`) | `ROLE_SELECT` |
| 4 | Select `1` (Patient) | Profile collection begins |
| 5 | Complete all 14 profile fields + 3 consents | `WELCOME` main menu |

**Profile required fields** (per [`EXHAUSTIVE_TEST_MATRIX.md §2`](EXHAUSTIVE_TEST_MATRIX.md)):
name, age, gender, address, pincode, state, cancerType, diagnosisDate, oncologistName, treatingHospital, treatmentStatus, emergencyContactName/Number/Relation + 3 consents

#### 4.1.2 Main Menu Indicators

| Condition | Option 1 (My Consultations) | Option 2 (Profile & Roles) |
|-----------|-----------------------------|---------------------------|
| Profile complete, no pending payment | No 🔴 | No 🔴 |
| Profile incomplete | 🔴 shown | 🔴 shown |
| Pending payment exists | 🔴 shown | No 🔴 |
| Both conditions | 🔴 on both | 🔴 on both |

#### 4.1.3 Consultation Sub-menu Indicators

Navigate: `WELCOME → 1 → CONSULTATION`

| Condition | Option 1 (Start New) | Option 2 (Check Payment) | Header |
|-----------|--------------------|--------------------------|--------|
| Profile incomplete | 🔴 shown | ⚠️ shown | ⚠️ warning in text |
| Pending payment | 🔴 on Start New | No special indicator | — |
| Both | 🔴 on Start New | ⚠️ shown | ⚠️ warning |
| Clean state | No 🔴 | No 🔴 | Normal |

#### 4.1.4 Profile Sub-menu Indicators

Navigate: `WELCOME → 2 → PROFILE_VIEW`

- **Test**: Profile incomplete → `🔴` on "Edit Profile"
- **Test**: All fields complete → No indicator
- **Test**: Back (`0`) → Returns to `WELCOME` (not generic reset)

#### 4.1.5 Invalid Input Handling

Per [`NAVIGATION_AUDIT_REPORT.md §4.1`](NAVIGATION_AUDIT_REPORT.md) (bugs fixed):

| Menu | Invalid Input | Expected |
|------|--------------|----------|
| `CONSULTATION` | `999` | Re-show `CONSULTATION` with `❌` |
| `BILLING` | `abc` | Re-show `BILLING` with `❌` |
| `CANCER_TYPE` | `0` | Returns to `WELCOME` |

---

### 4.2 Caregiver Role

> Flow reference: [`FLOW.md §Caregiver`](FLOW.md), [`EXHAUSTIVE_TEST_MATRIX.md §CAREGIVER`](EXHAUSTIVE_TEST_MATRIX.md)

#### 4.2.1 Onboarding Flow

```
ROLE_SELECT → 2 → CAREGIVER_AUTH → 1 (authorized) → PROFILE:caregiver_info
→ CAREGIVER_CONSENT_ACK → CAREGIVER_PATIENT_LINK → CAREGIVER_MENU
```

- **Test**: `CAREGIVER_AUTH` invalid input → re-prompts (not silent fallthrough — `NAVIGATION_AUDIT_REPORT §4.1` fix)
- **Test**: `CAREGIVER_PATIENT_LINK` invalid phone format → re-prompts
- **Test**: Valid 10-digit patient phone → `CAREGIVER_MENU`

#### 4.2.2 Caregiver Menu Indicators

`caregiverMenu(patientName, profileComplete)` — per [`DESIGN_CASCADING_INDICATORS.md §3.2`](DESIGN_CASCADING_INDICATORS.md)

| Condition | Option 1 (My Consultations) | Option 2 (Profile & Roles) |
|-----------|-----------------------------|---------------------------|
| Profile complete | No 🔴 | No 🔴 |
| Profile incomplete | 🔴 | 🔴 |

- **Test**: Switch Role via option `0` → `PERSONA_SELECT` (not `WELCOME`)
- **Test**: Switching to Caregiver via Switch Role sets `isCaregiver = true` (regression — `NAVIGATION_AUDIT_REPORT §3.2`)

---

### 4.3 Doctor Role

> Flow reference: [`ARCHITECTURE.md §Doctor Persona`](ARCHITECTURE.md), [`EXHAUSTIVE_TEST_MATRIX.md §DOCTOR`](EXHAUSTIVE_TEST_MATRIX.md)

#### 4.3.1 Doctor Menu Indicators

`doctorMenu(doctorName, hasActive, pendingActions)` — per [`DESIGN_CASCADING_INDICATORS.md §3.2`](DESIGN_CASCADING_INDICATORS.md)

| Condition | Option 1 (Status) |
|-----------|------------------|
| `pendingActions > 0` | 🔴 shown |
| No pending | No 🔴 |

#### 4.3.2 Doctor Actions

| Option | Action | Expected State |
|--------|--------|---------------|
| 1 | Status | Show pending actions list, return to `DOCTOR_MENU` |
| 2 | My Patients | Show linked patients, return to `DOCTOR_MENU` |
| 3 | Edit Profile | `DOCTOR_PROFILE_EDIT` |
| 4 | Message Admin | `DOCTOR_MSG_ADMIN_INPUT` |
| 0 | Switch Role | `PERSONA_SELECT` |

- **Test**: `DOCTOR_PROFILE_EDIT` back (`menu`/`0`) → `DOCTOR_MENU`
- **Test**: `DOCTOR_MSG_ADMIN_INPUT` back (`0`) → `DOCTOR_MENU`
- **Test**: Domain guard — message sent from non-domain state routes correctly (regression — `NAVIGATION_AUDIT_REPORT §4.2`)

---

### 4.4 Support Role

> Flow reference: [`EXHAUSTIVE_TEST_MATRIX.md §SUPPORT`](EXHAUSTIVE_TEST_MATRIX.md)

#### 4.4.1 Support Menu Indicators

`supportMenu(profileComplete, hasActiveConsultations)`

| Condition | Option 1 (My Consultations) | Option 4 (Profile) |
|-----------|----------------------------|-------------------|
| Profile incomplete | 🔴 | 🔴 |
| Has active consultations | 🔴 | — |
| Clean state | No 🔴 | No 🔴 |

#### 4.4.2 Support Actions

| Option | Action | Expected |
|--------|--------|----------|
| 1 | My Consultations | Active consultation list |
| 2 | Doctor Chat | `ADMIN_MESSAGE_DOCTOR_INPUT` |
| 3 | Patient Chat | `ADMIN_MESSAGE_PATIENT_INPUT` |
| 4 | Profile | `PROFILE_VIEW` |
| 0 | Switch Role | `PERSONA_SELECT` (not `WELCOME`) |

---

### 4.5 Admin Role

> Flow reference: [`ARCHITECTURE.md §Admin Persona`](ARCHITECTURE.md), [`NAVIGATION_AUDIT_REPORT.md §Phase 8`](NAVIGATION_AUDIT_REPORT.md)

#### 4.5.1 Admin Onboarding Gate

- **Test**: Fresh env-seeded admin (`ADMIN_PHONES`) `/start` → `adminMenuIncomplete` shown
  - Only options `5` (Profile) and `0` (Switch Role) active
  - Missing fields listed: `❌ Missing: Name, Phone Number`
- **Test**: After submitting name → `isAdminProfileComplete()` returns `true` → full menu unlocked
- **Test**: Attempting option `1` with incomplete profile → blocked with error (regression — `DETAILED_TEST_PLAN EDGE-002`)

#### 4.5.2 Admin Main Menu Indicators

`adminMenu(pending, active, isProfileComplete, hasPendingPayments, hasPendingDiscounts, pendingRoles, pendingDoctors)`

**Cascading priority** (deepest wins):
`Consultations(1)` < `Finances(2)` < `System&Roles(3)` < `MyProfile(4)`

| Condition | Indicator Location |
|-----------|--------------------|
| Profile incomplete only | 🔴 on `My Profile` |
| Pending requests only | 🔴 on `Consultations` |
| Pending payments only | 🔴 on `Finances` |
| Pending roles/doctors | 🔴 on `System & Roles` |
| Profile incomplete + pending payments | 🔴 on `Finances` (deeper) |
| All conditions | 🔴 on deepest applicable |

#### 4.5.3 Admin Sub-menu Flows

**Consultations Menu** (`ADMIN_CONSULTATIONS_MENU`):

| Condition | Indicator |
|-----------|-----------|
| `pending > 0` | 🔴 on Pending Requests |
| `active > 0` | 🟢 on Active Consultations |

**Finances Menu** (`ADMIN_FINANCES_MENU`):

| Condition | Indicator |
|-----------|-----------|
| `hasPendingPayments` | 🔴 on Verify Payment |
| `hasPendingDiscounts` | 🔴 on Verify Discount |

**System & Roles Menu** (`ADMIN_SYSTEM_MENU`):

| Condition | Indicator |
|-----------|-----------|
| `pendingRoles > 0` | 🔴 on Role Approvals |
| `pendingDoctors > 0` | 🔴 on Doctor Management |

**Role Approvals** (`ADMIN_ROLE_APPROVALS`):

| Condition | Indicator |
|-----------|-----------|
| `pending.doctor > 0` | 🔴 on Approve Doctor |
| `pending.caregiver > 0` | 🔴 on Approve Caregiver |
| `pending.support > 0` | 🔴 on Approve Support |
| Any pending | 🔴 on View Applications |

**Doctor Management** (`ADMIN_DOCTOR_MANAGEMENT`):

| Condition | Indicator |
|-----------|-----------|
| `pendingDocs > 0` | 🔴 on Register Doctor (X pending) |

#### 4.5.4 Admin Profile Edit Indicators

`adminProfileEdit(missingFields)` — per [`DESIGN_CASCADING_INDICATORS.md §4.1`](DESIGN_CASCADING_INDICATORS.md)

| Missing Field | Indicator |
|--------------|-----------|
| `name` | 🔴 on Edit Name |
| `phoneNumber` | 🔴 on Edit Phone Number |

---

### 4.6 Super Admin Role

> Inherits all Admin tests plus:

- **Test**: Menu header shows `🔐 *Super Admin Panel*` (not `🛠️ *Admin Panel*`)
- **Test**: Options 11 (Add Admin) and 12 (Remove Admin) visible
- **Test**: Option 6 shows "View All Patients" (not "View Patient Profiles")
- **Test**: Admin menu does NOT show options 11/12 (separation — `NAVIGATION_AUDIT_REPORT §7.3`)
- **Test**: `SUPER_ADMIN_MENU` state is distinct from `ADMIN_MENU`

---

## 5. Cascading Indicator E2E Scenarios

### 5.1 Patient Payment Cascade

> Spec: [`DESIGN_CASCADING_INDICATORS.md §5.1`](DESIGN_CASCADING_INDICATORS.md)

```
Setup: Patient has pending payment (feePending=false, status=pending)

1. WELCOME:      🔴 1️⃣ My Consultations     ← indicator
2. → CONSULTATION: 🔴 1️⃣ Start New Consultation ← cascades in
3. Admin verifies payment via option 7
4. WELCOME:      No 🔴 on My Consultations   ← clears
```

**Assert**: After step 3, `session.paymentVerified === true` and consultation record created.

### 5.2 Admin Doctor Approval Cascade

```
Setup: 3 pending doctor registrations in pending_doctors.json

1. ADMIN_MENU:         🔴 3️⃣ System & Roles
2. → ADMIN_SYSTEM_MENU: 🔴 Doctor Management
3. → ADMIN_DOCTOR_MANAGEMENT: 🔴 Register Doctor (3 pending)
4. Admin approves one doctor
5. → ADMIN_DOCTOR_MANAGEMENT: 🔴 Register Doctor (2 pending)
6. Approve all → No 🔴 at any level
```

### 5.3 Profile Completion Cascade (Patient)

```
Setup: Patient profile missing gender and cancerType

1. WELCOME:        🔴 2️⃣ Profile & Roles
2. → PROFILE_VIEW: 🔴 Edit Profile
3. → PROFILE_EDIT: 🔴 Edit Gender (if missing)
4. User completes gender
5. → PROFILE_EDIT: 🔴 Edit Cancer Type (next missing)
6. User completes cancer type
7. WELCOME:        No 🔴 on Profile & Roles
```

### 5.4 Admin Profile Completion Cascade

```
Setup: Admin profile has name=null (fresh env-seeded)

1. ADMIN_MENU (incomplete): Only options 5 & 0 enabled
2. Admin selects 5 (Profile) → ADMIN_PROFILE_EDIT
3. ADMIN_PROFILE_EDIT: 🔴 1️⃣ Edit Name
4. Admin submits NAME: Admin User
5. ADMIN_MENU (complete): Full menu shown, no 🔴
```

### 5.5 Finance Cascade (Payments + Discounts)

```
Setup: 1 pending payment, 1 pending discount

1. ADMIN_MENU:        🔴 2️⃣ Finances (deepest = discount)
2. → ADMIN_FINANCES_MENU:
      🔴 7️⃣ Verify Payment
      🔴 8️⃣ Verify Discount  ← indicator on deepest
3. Admin verifies discount
4. → ADMIN_FINANCES_MENU:
      🔴 7️⃣ Verify Payment   ← cascades up
      8️⃣ Verify Discount
5. Admin verifies payment
6. ADMIN_MENU: No 🔴 on Finances
```

---

## 6. Navigation Integrity Tests

> Based on fixes documented in [`NAVIGATION_AUDIT_REPORT.md`](NAVIGATION_AUDIT_REPORT.md)

### 6.1 Back Navigation Correctness

| From State | Option | Expected Destination | Regression? |
|-----------|--------|---------------------|-------------|
| `CAREGIVER_MENU` | `0` | `PERSONA_SELECT` | ✅ Fixed |
| `SUPPORT_MENU` | `0` | `PERSONA_SELECT` | ✅ Fixed |
| `DOCTOR_SELECT` | `0` | `PERSONA_SELECT` | ✅ Fixed |
| `CONSULTATION` (completed) | `0` | `PERSONA_SELECT` | ✅ Fixed |
| `PROFILE_VIEW` | `0` | Role home menu | ✅ Fixed |
| `PERSONA_SELECT` | `0`/cancel | Role home menu | ✅ Fixed |
| `ADMIN_ASSIGN_DOCTOR_INPUT` | `0` | `ADMIN_DOCTOR_MANAGEMENT` | ✅ Fixed |
| `ADMIN_APPROVE_DOCTOR_INPUT` | `0` | `ADMIN_ROLE_APPROVALS` | ✅ Fixed |

### 6.2 Domain State Guard Tests

> Spec: [`EXHAUSTIVE_TEST_MATRIX.md §4`](EXHAUSTIVE_TEST_MATRIX.md)

- **Test**: Admin sends message from `WELCOME` state → auto-routed to `ADMIN_MENU`
- **Test**: Doctor sends message from `PROFILE_EDIT` → handled by `DOCTOR_DOMAIN_STATES`
- **Test**: Support sends message from non-domain state → auto-routed to `SUPPORT_MENU`

### 6.3 "0" Option Consistency

- **Main menus** (Admin, Doctor, Support, Caregiver): `0` → `PERSONA_SELECT`
- **Submenu back navigation**: `0` → Named parent (e.g., `0️⃣ Back to Doctor Management`)
- **Test**: All back options specify their destination in text (not just "Back")

---

## 7. Invalid Input Tests

### 7.1 Menu Navigation

| State | Input | Expected |
|-------|-------|----------|
| Any menu | `999` | Re-show same menu + `❌ Invalid selection` |
| `CONSULTATION` | `5` | Re-show `CONSULTATION` |
| `BILLING` | `abc` | Re-show `BILLING` |
| `CAREGIVER_AUTH` | `5` | Re-show `CAREGIVER_AUTH` (not silent `2` fallthrough) |
| `PERSONA_SELECT` | `99` | Re-show `PERSONA_SELECT` with error |

### 7.2 Input Field Validation

| Field | Invalid Input | Expected |
|-------|--------------|----------|
| Phone number | `12345` (< 10 digits) | Stay at input with error |
| Transaction ID | `abc xyz` | Error message |
| Role number | Letter | Error message |
| Patient phone in caregiver link | Non-numeric | Re-prompt |

---

## 8. Session & Persistence Tests

### 8.1 Session Persistence

> Spec: [`FEATURE_MATRIX_ALL_STATES.md §Session Persistence`](FEATURE_MATRIX_ALL_STATES.md), [`DETAILED_TEST_PLAN.md PERS-001`](DETAILED_TEST_PLAN.md)

- **Test**: Bot restart → session recovered from `data/sessions.json`
- **Test**: Patient mid-consultation → profile and `paymentTransaction` preserved
- **Test**: `/clear` → `flowState` reset to `WELCOME`, profile and media preserved

### 8.2 Data Persistence

- **Test**: Admin profile edits persist in `data/admins.json`
- **Test**: Role approvals persist in `data/users.json`
- **Test**: Doctor registrations persist in `data/doctors.json`
- **Test**: Consultation records created after payment verified (regression — `NAVIGATION_AUDIT_REPORT §2.2`)

### 8.3 Payment TTL

> Spec: [`FLOW.md §Payment TTL`](FLOW.md)

- **Test**: Payment link expires after 24h — patient must re-request
- **Test**: Admin sees `expired` status for TTL-expired payment

---

## 9. Role Switching Tests

> Spec: [`DETAILED_TEST_PLAN.md ROLE-004`](DETAILED_TEST_PLAN.md), [`FEATURE_MATRIX_ALL_STATES.md §RBAC`](FEATURE_MATRIX_ALL_STATES.md)

| From | To | Steps | Expected |
|------|----|-------|----------|
| Admin | Patient | `0` → PERSONA_SELECT → `1` | Patient `WELCOME` |
| Patient | Admin | `0` → `4` | `ADMIN_MENU` |
| Caregiver (Switch Role) | Self | Select Caregiver | `session.isCaregiver = true` (regression fix) |
| Doctor | Admin (if approved) | `0` → Admin option | `ADMIN_MENU` |
| Any role | Cancel switch | `0` in `PERSONA_SELECT` | Returns to role home menu |

---

## 10. Edge Cases

### 10.1 Concurrent / Conflict Scenarios

- **Test**: Two admins approve same doctor → idempotent result
- **Test**: Multiple devices, same user → consistent session state
- **Test**: Session timeout (30 min idle) → auto-reset to `WELCOME`, doctor released, admin notified

### 10.2 Profile-Blocked Actions

- **Test**: Patient with incomplete profile clicks My Consultations → shows `⚠️` warning, blocks start
- **Test**: Admin with incomplete profile selects option `1` → blocked with profile prompt
- **Test**: Doctor with incomplete profile → patient messaging blocked

### 10.3 Withdrawal & Lifecycle Edge Cases

- **Test**: Consultation withdrawal with no active consultation → blocked with error
- **Test**: Closing already-closed consultation → blocked
- **Test**: Removing doctor with active consultations → blocked
- **Test**: Duplicate role application before approval → idempotent or rejected

### 10.4 DPDP Compliance

> Spec: [`FLOW.md §Healthcare Compliance Updates`](FLOW.md)

- **Test**: `/delete` clears personal profile, preserves consultation records
- **Test**: User can re-register via `/start` after deletion
- **Test**: Data sharing consent type stored as `caregiver` for caregivers

---

## 11. Response Validation Tests

> Gap identified in [`DESIGN_CASCADING_INDICATORS.md §6.2`](DESIGN_CASCADING_INDICATORS.md)

All menu handler responses **must be strings**, never function references.

```javascript
// Template assertion for every handler
const result = flow.handleXMenuSelection('1', phoneNumber, session);
assert.strictEqual(typeof result.response, 'string',
  'Response must be a string, not a function reference');
assert.ok(result.response.length > 0, 'Response must not be empty');
assert.ok(result.nextState, 'nextState must be defined');
```

**Handlers requiring explicit string-response tests:**
- `handleCaregiverMenuSelection` (option 1 → `consultation()` call)
- `handleSupportMenuSelection` (option 1, 2, 3)
- `handleAdminMenuSelection` (all sub-menu transitions)
- `handleSuperAdminMenuSelection` (all options)

---

## 12. Test Data Generation

```javascript
const testData = {
  patient: {
    complete: {
      name: 'Ramesh Kumar', age: 55, gender: 'Male',
      address: '123 Main St', pincode: '110001', state: 'Delhi',
      cancerType: 'lung', diagnosisDate: '01/01/2026',
      oncologistName: 'Dr. Priya Sharma',
      treatingHospital: 'AIIMS Delhi', treatmentStatus: 'Active',
      emergencyContactName: 'Sunita', emergencyContactNumber: '9811111112',
      emergencyContactRelation: 'Wife',
      confirmedConsents: { teleconsultation: true, dataSharing: true, dpdp: true }
    },
    incomplete: { name: 'Test', age: 30 } // missing gender, cancerType, etc.
  },
  admin: {
    complete: { name: 'Admin User', phoneNumber: '9999999999' },
    incomplete: { name: null }             // freshly env-seeded
  },
  payments: [
    { id: 'txn_1', status: 'pending', feePending: false },
    { id: 'txn_2', status: 'completed', feePending: false }
  ],
  pendingDoctors: [
    { id: 'doc_pending_1', name: 'Dr. Test', status: 'pending' }
  ]
};
```

---

## 13. Pass Criteria

| Criterion | Target |
|-----------|--------|
| All automated tests pass | 250+ tests, 0 failures |
| No `[Function]` in any menu output | 0 occurrences |
| Indicators cascade correctly at all levels | All role/scenario combos |
| All state transitions complete (36 states) | 36/36 reachable |
| Invalid inputs handled — no silent fallthrough | All menu states |
| Persistence works across bot restart | Sessions, profiles, payments |
| Back navigation lands on correct parent | All submenu back paths |
| Single-indicator-per-context rule enforced | All multi-condition scenarios |
| Response type is always `string` | All menu handlers |
| Domain state guards prevent session leakage | All 4 role domains |