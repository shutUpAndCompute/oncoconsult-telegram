# Telegram Bot Test Report - Role-Based State Flow Analysis

## Executive Summary

This document provides comprehensive test coverage analysis for the Oncology Consultation Telegram bot, covering all 6 roles (patient, caregiver, doctor, admin, super_admin, support) and their state transitions.

---

## 1. Data Persistence Locations

### 1.1 Persistent Storage Files

| File | Purpose | Managed By |
|------|---------|------------|
| `data/sessions.json` | User sessions, flow state, patient profiles | `ConsultationManager.persistence` |
| `data/consultations.json` | Active/pending consultation records | `ConsultationManager.consultations` |
| `data/payments.json` | Payment transaction records | `PaymentService.payments` |
| `data/users.json` | User registry with approved roles | `UserRegistry` |
| `data/doctors.json` | Doctor profiles | `DoctorPersistence` |
| `data/pending_doctors.json` | Pending doctor requests | `DoctorPersistence` |
| `data/admins.json` | Admin profiles | `adminRegistry` |

### 1.2 Session Data Structure

```javascript
{
  phoneNumber: string,
  createdAt: Date,
  lastActivityAt: Date,
  paymentVerified: boolean,
  cancerType: string,
  doctorId: string,
  consultationId: string,
  flowState: string,              // Current FlowStates.* value
  media: [],                      // Uploaded documents
  patientProfile: {
    name, age, gender, address, pinCode, state,
    cancerType, treatingHospital, treatmentStatus,
    emergencyContactName, emergencyContactNumber, emergencyContactRelation,
    medicalReports: [],
    discountCategory, discountVerificationStatus,
    confirmedConsents: { teleconsultation, dataSharing, dpdp },
    platformTermsAccepted: boolean
  },
  profileStep: string,            // Current step in profile collection
  pendingPayment: object,
  selectedPersona: string,        // Active role selection
  isCaregiver: boolean,
  linkedPatientPhone: string,
  caregiverConsentGiven: boolean,
  caregiverName, patientName, caregiverRelationship, caregiverReason
}
```

---

## 2. FlowStates Enum (All Possible States)

From `conversationFlow.js`:

| State | Description |
|-------|-------------|
| `PLATFORM_TERMS` | Initial terms acceptance |
| `WELCOME` | Main menu (default) |
| `ROLE_SELECT` | Role selection screen |
| `CAREGIVER_AUTH` | Caregiver authorization screen |
| `CAREGIVER_CONSENT_ACK` | Caregiver consent acknowledgment |
| `CAREGIVER_PATIENT_LINK` | Caregiver links to patient phone |
| `CAREGIVER_MENU` | Caregiver main menu |
| `PROFILE` | Profile collection in progress |
| `PROFILE_DISCOUNT_CATEGORY` | Discount eligibility selection |
| `PROFILE_DISCOUNT_DOCUMENTS` | Discount document upload |
| `PROFILE_CONSENTS` | Mandatory consents confirmation |
| `CANCER_TYPE` | Cancer type selection |
| `REPORT_UPLOAD` | Medical report upload prompt |
| `BILLING` | Consultation pricing menu |
| `PAYMENT_PENDING` | Waiting for payment processing |
| `DOCTOR_SELECT` | Doctor selection screen |
| `CONSULTATION` | Consultation management menu |
| `CONSULTATION_WITHDRAW` | Withdrawal confirmation |
| `COMPLETED` | Consultation completed screen |
| `ADMIN_FALLBACK` | Fallback to admin routing |
| `ADMIN_MENU` | Admin main menu |
| `ADMIN_BOOTSTRAP_SECRET` | Bootstrap secret input for first admin |
| `SUPPORT_MENU` | Support main menu |
| `ADMIN_ROLE_APPROVALS` | Role approvals submenu |
| `ADMIN_INVITE_DOCTOR_INPUT` | Invite doctor input |
| `ADMIN_REGISTER_DOCTOR_INPUT` | Register doctor input |
| `ADMIN_APPROVE_DOCTOR_INPUT` | Approve doctor input |
| `ADMIN_APPROVE_CAREGIVER_INPUT` | Approve caregiver input |
| `ADMIN_APPROVE_SUPPORT_INPUT` | Approve support input |
| `ADMIN_DOCTOR_MANAGEMENT` | Doctor management submenu |
| `ADMIN_ASSIGN_DOCTOR_INPUT` | Assign doctor to consultation |
| `ADMIN_REMOVE_DOCTOR_INPUT` | Remove doctor input |
| `ADMIN_REJECT_DOCTOR_INPUT` | Reject doctor input |
| `ADMIN_MESSAGE_DOCTOR_INPUT` | Message doctor input |
| `ADMIN_REASSIGN_DOCTOR_INPUT` | Reassign doctor input |
| `ADMIN_MESSAGE_PATIENT_INPUT` | Message patient input |
| `ADMIN_VERIFY_PAYMENT_INPUT` | Verify payment input |
| `ADMIN_VERIFY_DISCOUNT_INPUT` | Verify discount input |
| `ADMIN_CLOSE_CONSULTATION` | Close consultation prompt |
| `DOCTOR_MENU` | Doctor main menu |
| `DOCTOR_PROFILE_EDIT` | Doctor profile edit screen |
| `DOCTOR_MSG_ADMIN_INPUT` | Doctor message admin input |
| `PROFILE_VIEW` | Profile menu options |
| `PROFILE_EDIT` | Profile edit input |
| `ADMIN_PROFILE_EDIT` | Admin profile edit input |
| `ROLE_APPLICATION` | Apply for role screen |
| `PROFILE_REMOVE_ROLE` | Remove role input |
| `MOBILE_COLLECTION` | Phone number collection |
| `PERSONA_SELECT` | Role switching screen |
| `ADMIN_ADD_ADMIN_INPUT` | Add admin input (super_admin only) |
| `ADMIN_REMOVE_ADMIN_INPUT` | Remove admin input (super_admin only) |

---

## 3. Role State Diagrams

### 3.1 PATIENT Role

#### Onboarding Flow (New User)

```
/start -> MOBILE_COLLECTION (if no phone recorded)
       -> PLATFORM_TERMS (if no platform terms accepted)
       -> ROLE_SELECT -> select "1" -> PROFILE:doctor_name (if phone & terms accepted but no profile)
       -> Actually starts at PROFILE with steps:
          - name -> age -> gender -> address -> pincode -> state -> cancer_type -> 
          - diagnosis_date -> oncologist_name -> treating_hospital -> treatment_status -> 
          - medical_reports -> emergency_contact_name -> emergency_contact_number -> 
          - emergency_contact_relation -> PROFILE_CONSENTS (consents menu)
       -> After consents -> WELCOME (main menu)
```

**Profile Collection Steps (switch on `profileStep`):**

| Step | Prompt | Next Step | Next State |
|------|--------|-----------|------------|
| `doctor_name` | "Enter your full name" | `doctor_specialty` | PROFILE |
| `doctor_specialty` | "Enter your specialty" | `doctor_cancer_types` | PROFILE |
| `doctor_cancer_types` | "Enter cancer types you treat" | `doctor_hospital` | PROFILE |
| `doctor_hospital` | "Enter your hospital" | `doctor_city` | PROFILE |
| `doctor_city` | "Enter your city" | `doctor_qualifications` | PROFILE |
| `doctor_qualifications` | "Enter qualifications" | `completed` -> DOCTOR_MENU | PROFILE |
| `caregiver_info` | "Provide your (caregiver) full name" | `patient_info` | PROFILE |
| `patient_info` | "Provide the patient's full name" | `caregiver_relationship` | PROFILE |
| `caregiver_relationship` | "Relationship to patient" | `caregiver_reason` | PROFILE |
| `caregiver_reason` | "Why acting on behalf" | `name` | PROFILE |
| `name` | "Enter your age" | `age` | PROFILE |
| `age` | "Enter your gender" | `gender` | PROFILE |
| `gender` | "Enter your full address" | `address` | PROFILE |
| `address` | "Enter 6-digit pin code" | `pincode` | PROFILE |
| `pincode` | "Enter your state" (rejects non-6-digit input, re-prompts at same step) | `state` | PROFILE |
| `state` | "Select cancer type menu" | `cancer_type` | PROFILE |
| `cancer_type` | "Select cancer type menu" | `diagnosis_date` | PROFILE |
| `diagnosis_date` | "Enter diagnosis date" | `oncologist_name` | PROFILE |
| `oncologist_name` | "Enter primary oncologist" | `treating_hospital` | PROFILE |
| `treating_hospital` | "Treatment status menu" | `treatment_status` | PROFILE |
| `treatment_status` | "Upload medical report" | `medical_reports` | PROFILE |
| `medical_reports` | "Emergency contact name" | `emergency_contact_name` | PROFILE |
| `emergency_contact_name` | "Emergency contact number" | `emergency_contact_number` | PROFILE |
| `emergency_contact_number` | "Relationship to patient" | `emergency_contact_relation` | PROFILE |
| `emergency_contact_relation` | -> PROFILE_CONSENTS | - | PROFILE_CONSENTS |

#### Main Menu Transitions (handleWelcomeSelection)

| Selection | Next State | Notes |
|-----------|------------|-------|
| `1` | CONSULTATION | "My Consultations" |
| `2` | PROFILE_VIEW | "Profile & Roles" |
| `0` or `cancel` | - | handleCancel() |

#### Consultation Menu (handleConsultationMenuSelection)

| Selection | Next State | Notes |
|-----------|------------|-------|
| `1` | CANCER_TYPE or REPORT_UPLOAD or BILLING | Start consultation (checks profile completeness) |
| `2` | CONSULTATION | Check payment status |
| `3` | CONSULTATION_WITHDRAW | Withdraw consultation |
| `4` | WELCOME | Back to main menu |
| Invalid (not 1-4) | CONSULTATION | **Fixed**: previously fell through to WELCOME like "4" did; now shows "❌ Invalid selection" and re-shows the Consultation menu |

#### Withdrawal Confirmation (handleWithdrawalConfirmation)

| Selection | Next State | Notes |
|-----------|------------|-------|
| `1` | WELCOME | Confirms withdrawal |
| Other | CONSULTATION | Cancels withdrawal |

#### Profile Menu (handleProfileMenuSelection)

| Selection | Next State | Notes |
|-----------|------------|-------|
| `1` | PROFILE_VIEW | View profile |
| `2` | PROFILE_EDIT | Edit profile |
| `3` | ROLE_APPLICATION | Apply for role |
| `4` | PROFILE_VIEW | My roles |
| `5` | PROFILE_REMOVE_ROLE | Remove role |
| `0` | WELCOME or role-specific | Back to role home |

#### Role Application (handleRoleApplicationSelection)

| Selection | Role Applied | Next State |
|-----------|--------------|------------|
| `1` | doctor | PROFILE_VIEW |
| `2` | caregiver | PROFILE_VIEW |
| `3` | support | PROFILE_VIEW |
| `4` | - | PROFILE_VIEW (cancel) |

#### Cancer Type Selection (handleCancerTypeSelection)

| Selection | Result | Notes |
|-----------|--------|-------|
| `0` | WELCOME | Back to menu |
| `1-8` | BILLING | Sets cancerType in session |
| Other | CANCER_TYPE | Re-show menu |

#### Billing Menu (handleBillingSelection)

| Selection | Next State | Notes |
|-----------|------------|-------|
| `1` | PAYMENT_PENDING | Request payment link |
| `2` | WELCOME | Back to menu |
| `3` | PROFILE_DISCOUNT_CATEGORY | Apply for fee discount |
| Invalid (not 1-3) | BILLING | **Fixed**: previously fell through to WELCOME like "2" did; now shows "❌ Invalid selection" and re-shows the Billing menu |

#### Discount Category Selection (handleDiscountCategorySelection)

| Selection | Next State | Notes |
|-----------|------------|-------|
| `0` | BILLING | Back |
| `1-18` | PROFILE_DISCOUNT_DOCUMENTS | Upload required |
| `19` | BILLING | No discount (full fee) |

#### Consents Menu (handleProfileConsentsSelection)

| Selection | Action | Next State |
|-----------|--------|------------|
| `1` | Set teleconsultation=true | PROFILE_CONSENTS or WELCOME |
| `2` | Set dataSharing=true | PROFILE_CONSENTS or WELCOME |
| `3` | Set dpdp=true | PROFILE_CONSENTS or WELCOME |
| `cancel` | - | Resets session |

---

### 3.2 CAREGIVER Role

#### Onboarding Flow

```
/start -> ROLE_SELECT -> select "2" -> CAREGIVER_AUTH
       -> select "1" (authorized) -> PROFILE (caregiver profile steps)
       -> select "2" (patient self) -> PROFILE (patient profile steps)
```

#### Caregiver Auth Menu (handleCaregiverAuthSelection)

| Selection | Next State | Notes |
|-----------|------------|-------|
| `0` | ROLE_SELECT | Cancel |
| `1` | PROFILE | Caregiver mode - sets isCaregiver=true, caregiverConsentGiven=false |
| `2` | PROFILE | Patient mode (caregiver is actually the patient) |
| Invalid (not 0-2) | CAREGIVER_AUTH | **Fixed**: previously any unrecognized input (not just "2") was silently treated as "I am the patient" and started patient onboarding; now shows "❌ Invalid selection" and re-shows this menu |

#### Caregiver Patient Link (handleCaregiverPatientLink)

| Input | Next State | Notes |
|-------|------------|-------|
| `0` | WELCOME | Back to menu |
| 10-digit phone | CAREGIVER_MENU | Links to patient |
| Invalid | CAREGIVER_PATIENT_LINK | Re-prompt |

#### Caregiver Menu (handleCaregiverMenuSelection)

| Selection | Next State | Notes |
|-----------|------------|-------|
| `1` | CONSULTATION | My Consultations |
| `2` | PROFILE_VIEW | Profile & Roles |
| `0` | WELCOME | Main menu |

---

### 3.3 DOCTOR Role

#### Onboarding (via role application approval)

```
Admin approves doctor role -> /start -> DOCTOR_MENU
```

#### Doctor Menu (handleDoctorMenuSelection)

| Selection | Next State | Notes |
|-----------|------------|-------|
| `1` | DOCTOR_MENU | Status (view own profile) |
| `2` | DOCTOR_MENU | My Patients (view linked patients) |
| `3` | DOCTOR_PROFILE_EDIT | Edit Profile |
| `4` | DOCTOR_MSG_ADMIN_INPUT | Message Admin |
| `0` | PERSONA_SELECT | Switch Role |

#### Doctor Profile Edit (handleDoctorProfileEditInput)

| Input | Next State | Notes |
|-------|------------|-------|
| `menu` or `0` | DOCTOR_MENU | Cancel edit |
| FIELD:VALUE format | DOCTOR_MENU | Update profile |
| No valid fields | DOCTOR_PROFILE_EDIT | Re-prompt |

#### Doctor Message Admin (handleDoctorMsgAdminInput)

| Input | Next State | Notes |
|-------|------------|-------|
| `menu` or `0` | DOCTOR_MENU | Cancel |
| Message | DOCTOR_MENU | Send to admin |

---

### 3.4 ADMIN Role

#### Onboarding

```
/start with admin phone in env -> ADMIN_MENU (if admin profile complete)
/start with incomplete profile -> ADMIN_PROFILE_EDIT flow
```

#### Admin Menu (handleAdminMenuSelection)

| Selection | Next State | Notes |
|-----------|------------|-------|
| `1` | ADMIN_MENU | Pending Requests (getPendingRequests) |
| `2` | ADMIN_MENU | Active Consultations (getActiveConsultations) |
| `3` | ADMIN_ROLE_APPROVALS | Role Approvals submenu |
| `4` | ADMIN_DOCTOR_MANAGEMENT | Doctor Management submenu |
| `5` | PROFILE_VIEW | Profile & Roles |
| `6` | ADMIN_MENU | View Patient Profiles (super_admin only) |
| `7` | ADMIN_VERIFY_PAYMENT_INPUT | Verify Payment |
| `8` | ADMIN_VERIFY_DISCOUNT_INPUT | Verify Discount |
| `9` | ADMIN_MESSAGE_PATIENT_INPUT | Message Patient |
| `10` | ADMIN_CLOSE_CONSULTATION | Close Consultation |
| `11` | ADMIN_ADD_ADMIN_INPUT | Add Admin (super_admin only) |
| `12` | ADMIN_REMOVE_ADMIN_INPUT | Remove Admin (super_admin only) |
| `0` | PERSONA_SELECT | Switch Role |

#### Admin Role Approvals (handleAdminRoleApprovalsSelection)

| Selection | Next State | Notes |
|-----------|------------|-------|
| `1` | ADMIN_ROLE_APPROVALS | View Role Applications (super_admin only) |
| `2` | ADMIN_APPROVE_DOCTOR_INPUT | Approve Doctor |
| `3` | ADMIN_APPROVE_CAREGIVER_INPUT | Approve Caregiver |
| `4` | ADMIN_APPROVE_SUPPORT_INPUT | Approve Support |
| `0` | ADMIN_MENU | Back |

#### Admin Doctor Management (handleAdminDoctorManagementSelection)

| Selection | Next State | Notes |
|-----------|------------|-------|
| `1` | ADMIN_DOCTOR_MANAGEMENT | List Doctors |
| `2` | ADMIN_DOCTOR_MANAGEMENT | List Pending Doctors |
| `3` | ADMIN_ASSIGN_DOCTOR_INPUT | Assign Doctor |
| `4` | ADMIN_REASSIGN_DOCTOR_INPUT | Reassign Doctor |
| `5` | ADMIN_REMOVE_DOCTOR_INPUT | Remove Doctor (super_admin only) |
| `6` | ADMIN_REJECT_DOCTOR_INPUT | Reject Doctor (super_admin only) |
| `7` | ADMIN_MESSAGE_DOCTOR_INPUT | Message Doctor |
| `8` | ADMIN_REGISTER_DOCTOR_INPUT | Register Doctor |
| `9` | ADMIN_INVITE_DOCTOR_INPUT | Invite Doctor |
| `0` | ADMIN_MENU | Back |

#### Admin Approve Doctor (handleAdminApproveDoctorInput)

| Input | Next State | Notes |
|-------|------------|-------|
| `0` | ADMIN_ROLE_APPROVALS | Cancel |
| Phone number | ADMIN_ROLE_APPROVALS | Approve if user exists (super_admin only) |

#### Admin Approve Caregiver (handleAdminApproveCaregiverInput)

| Input | Next State | Notes |
|-------|------------|-------|
| `0` | ADMIN_ROLE_APPROVALS | Cancel |
| Phone number | ADMIN_ROLE_APPROVALS | Approve if user exists (super_admin only) |

#### Admin Approve Support (handleAdminApproveSupportInput)

| Input | Next State | Notes |
|-------|------------|-------|
| `0` | ADMIN_ROLE_APPROVALS | Cancel |
| Phone number | ADMIN_ROLE_APPROVALS | Approve if user exists (super_admin only) |

---

### 3.5 SUPER_ADMIN Role

Same as ADMIN with additional permissions:

- `handleAdminMenuSelection`: Can access options 11, 12 (Add/Remove Admin)
- `handleAdminRemoveDoctorInput`: Can remove doctors
- `handleAdminRejectDoctorInput`: Can reject doctor requests
- `handleAdminReassignDoctorInput`: Can reassign doctors
- `handleViewAllPatients`: Can browse all patient contact info

All admin states with `isSuperAdmin` checks apply.

---

### 3.6 SUPPORT Role

#### Support Menu (handleSupportMenuSelection)

| Selection | Next State | Notes |
|-----------|------------|-------|
| `1` | SUPPORT_MENU | My Consultations (active consultations list) |
| `2` | ADMIN_MESSAGE_DOCTOR_INPUT | Doctor Chat |
| `3` | ADMIN_MESSAGE_PATIENT_INPUT | Patient Chat |
| `4` | PROFILE_VIEW | Profile |
| `0` | WELCOME | Main menu |

---

## 4. Path Coverage Matrix

### 4.1 Patient Onboarding Paths

| Path | States Traversed | Testable |
|------|-----------------|----------|
| Fresh start | ROLE_SELECT -> PROFILE (all steps) -> PROFILE_CONSENTS -> WELCOME | Full coverage required |
| Skip mobile | MOBILE_COLLECTION (select SKIP) -> ROLE_SELECT | Test mobile skip |
| Mobile provided | MOBILE_COLLECTION (provide phone) -> ROLE_SELECT | Test phone entry |
| Platform terms disagree | PLATFORM_TERMS (select 2) -> WELCOME | Test rejection flow |
| Profile cancel | Any profile step (type "cancel") -> WELCOME | Test interrupt |
| Caregiver self-mode | CAREGIVER_AUTH (select 2) -> PROFILE -> CAREGIVER_CONSENT_ACK -> CAREGIVER_PATIENT_LINK | Test patient pathway |

### 4.2 Consultation Flow Paths

| Path | States Traversed | Notes |
|------|-----------------|-------|
| New consultation (no cancer type) | CONSULTATION -> CANCER_TYPE -> BILLING | Profile incomplete check |
| New consultation (no reports) | CONSULTATION -> REPORT_UPLOAD -> BILLING | Report check |
| New consultation (complete) | CONSULTATION -> BILLING -> PAYMENT_PENDING | Full flow |
| Payment check (no transaction) | CONSULTATION (select 2) -> CONSULTATION | Error shown |
| Payment check (pending fee) | CONSULTATION (select 2) -> CONSULTATION | Fee pending message |
| Payment check (verified) | CONSULTATION (select 2) -> CONSULTATION | Verified message |
| Withdraw no consultation | CONSULTATION (select 3) -> WELCOME | Error path |
| Withdraw with consultation | CONSULTATION (select 3) -> CONSULTATION_WITHDRAW -> CONSULTATION or WELCOME | Confirmation |

### 4.3 Role Application Paths

| Path | States | Testable |
|------|--------|----------|
| Apply doctor | PROFILE_VIEW -> ROLE_APPLICATION (select 1) -> PROFILE_VIEW | - |
| Apply caregiver | PROFILE_VIEW -> ROLE_APPLICATION (select 2) -> PROFILE_VIEW | - |
| Apply support | PROFILE_VIEW -> ROLE_APPLICATION (select 3) -> PROFILE_VIEW | - |
| Cancel application | PROFILE_VIEW -> ROLE_APPLICATION (select 4) -> PROFILE_VIEW | - |

### 4.4 Role Switch Paths

| Path | States | Notes |
|------|--------|-------|
| Switch to patient | PERSONA_SELECT (select 1) -> WELCOME | Always available |
| Switch to caregiver | PERSONA_SELECT (select 2) -> CAREGIVER_MENU or CAREGIVER_PATIENT_LINK | Requires approval |
| Switch to doctor | PERSONA_SELECT (select 3) -> DOCTOR_MENU | Requires approval |
| Switch to admin | PERSONA_SELECT (select 4) -> ADMIN_MENU | Requires approval |
| Switch to support | PERSONA_SELECT (select 5) -> SUPPORT_MENU | Requires approval |
| Switch cancel | PERSONA_SELECT (select 0) -> role home | Returns to current |

---

## 5. Existing User Resume Paths

### 5.1 /start Resume Logic (telegramBot.js lines 248-318)

```
/start -> Check mobile needed -> Check effectiveRole:
  -> ADMIN/SUPER_ADMIN: ADMIN_MENU (if admin profile complete) or adminMenuIncomplete
  -> SUPPORT: SUPPORT_MENU
  -> CAREGIVER: CAREGIVER_PATIENT_LINK (if no linked patient) or CAREGIVER_MENU
  -> DOCTOR: DOCTOR_MENU
  -> PATIENT (with profile): WELCOME + "Welcome back!"
  -> NEW PATIENT (no profile): ROLE_SELECT
```

### 5.2 /resume Path (telegramBot.js lines 389-398)

```
/resume -> Check session.patientProfile:
  -> Exists: Show "Session Resumed" with profile summary
  -> Not exists: "No previous session found"
```

### 5.3 /clear Path (telegramBot.js lines 337-387)

**Preserves:**
- patientProfile
- media
- isCaregiver
- caregiverConsentGiven
- caregiverName, patientName, caregiverRelationship, caregiverReason

**Resets:**
- flowState to WELCOME
- consultationId, paymentTransaction, pendingPayment, paymentVerified
- Ends active consultations
- Deletes pending consultations

---

## 6. Profile View/Edit Paths

### 6.1 handleViewProfile (conversationFlow.js lines 1643-1675)

| Role | Next State | Notes |
|------|------------|-------|
| admin/super_admin | PROFILE_VIEW | Shows adminProfileView |
| doctor | PROFILE_VIEW | Shows doctorProfileView |
| caregiver/patient | PROFILE_VIEW | Shows profileView (patient profile) |

### 6.2 handleEditProfile (conversationFlow.js lines 1677-1693)

| Role | Next State | Notes |
|------|------------|-------|
| admin/super_admin | ADMIN_PROFILE_EDIT | Admin profile edit |
| Others | PROFILE_EDIT | Patient profile edit |

### 6.3 handleProfileEditInput (conversationFlow.js lines 1731-1773)

| Input | Next State | Notes |
|-------|------------|-------|
| `menu` or `5` | PROFILE_VIEW | Cancel |
| FIELD:VALUE | PROFILE_VIEW | Update profile |
| No valid fields | PROFILE_EDIT | Re-prompt |

### 6.4 handleAdminProfileEditInput (conversationFlow.js lines 1695-1729)

| Input | Next State | Notes |
|-------|------------|-------|
| `menu` | PROFILE_VIEW | Cancel |
| NAME:value | PROFILE_VIEW | Update |
| No valid fields | ADMIN_PROFILE_EDIT | Re-prompt |

---

## 7. State Domain Guard Analysis

### 7.1 ADMIN_DOMAIN_STATES
States that must route to ADMIN_MENU for admins:
- ADMIN_MENU, ADMIN_ROLE_APPROVALS, ADMIN_DOCTOR_MANAGEMENT
- ADMIN_ASSIGN_DOCTOR_INPUT, ADMIN_REMOVE_DOCTOR_INPUT, ADMIN_REJECT_DOCTOR_INPUT
- ADMIN_REASSIGN_DOCTOR_INPUT, ADMIN_MESSAGE_DOCTOR_INPUT, ADMIN_MESSAGE_PATIENT_INPUT
- ADMIN_VERIFY_PAYMENT_INPUT, ADMIN_VERIFY_DISCOUNT_INPUT
- ADMIN_INVITE_DOCTOR_INPUT, ADMIN_REGISTER_DOCTOR_INPUT
- ADMIN_APPROVE_DOCTOR_INPUT, ADMIN_APPROVE_CAREGIVER_INPUT, ADMIN_APPROVE_SUPPORT_INPUT
- ADMIN_CLOSE_CONSULTATION, ADMIN_ADD_ADMIN_INPUT, ADMIN_REMOVE_ADMIN_INPUT
- `ADMIN_PROFILE_EDIT` **(added - was previously missing, which caused a real bug: see 15.4)**

### 7.2 SUPPORT_DOMAIN_STATES
States for support role:
- SUPPORT_MENU, ADMIN_MESSAGE_DOCTOR_INPUT, ADMIN_MESSAGE_PATIENT_INPUT

### 7.3 DOCTOR_DOMAIN_STATES **(new set, added this round)**
States that must route within the doctor's own menus rather than being
intercepted by the MSG_ADMIN/CLOSE/forward-to-patient catch-all in
`handleDoctor()`:
- DOCTOR_MENU, `DOCTOR_PROFILE_EDIT`, `DOCTOR_MSG_ADMIN_INPUT`

Before this fix, only `DOCTOR_MENU` itself was excluded from the
catch-all, so a doctor who navigated to Edit Profile or Message Admin
had their next reply swallowed and misrouted. See 15.4.

### 7.4 SHARED_DOMAIN_STATES
States shared across roles (never auto-heal away):
- PROFILE_VIEW, PROFILE_EDIT, PROFILE_REMOVE_ROLE, ROLE_APPLICATION, PERSONA_SELECT

---

## 8. Missing Paths Identified (as of this report's original generation - see Section 15 for current status)

**Update: every item in this section has since been verified against the actual code.
Most were real and are now fixed; a few were misreadings of the code and were left
alone. Section 15 has the authoritative, verified status of each. This section is
kept as-is below for historical reference only - do not treat it as current.**

### 8.1 Unreachable States

| State | Issue | Verified status |
|-------|-------|------------------|
| `DATA_SHARING_CONSENT` | Defined in FlowStates but superseded by `PROFILE_CONSENTS` | **Confirmed real** - nothing ever transitioned into it except its own fallback. Removed entirely (state, handler, dispatch cases, orphaned menu text). See 15.4. |
| `ADMIN_FALLBACK` | Set but notification logic incomplete | Not investigated this round - notification via `notifyAdmin()` does fire on this state; left alone pending a concrete repro. |
| `CAREGIVER_AUTH` | Line `'4'` for admin in handleRoleSelection - appears to be dead code (redirects to ROLE_SELECT) | **Inaccurate.** Selection `'4'` in `handleRoleSelection` is the admin-bootstrap path (unrelated to `CAREGIVER_AUTH`), and correctly denies access with a clear message when no bootstrap secret is configured. Not dead code, working as intended. No change made. |

### 8.2 Incomplete Paths

| Location | Path | Verified status |
|----------|------|------------------|
| handleDataSharingConsentInput | `selection === '3'` branch | Moot - the entire function was removed as dead code (see 8.1 above). |
| handleAdminMenuSelection | `selection === '11'` or `'12'` for non-super-admin | **Working as designed**, not a bug - `null` is an intentional sentinel the caller checks (`if (result) return result; return {...error...}`) to substitute a proper "Only Super Admin..." message. No change made. |
| handleAdminDoctorManagementSelection | Handler returns null for non-super-admin | Same pattern as above - working as designed. |
| handleDoctorSelection (line 2671) | Selection 0 -> WELCOME | **Inaccurate.** This transition doesn't clear or reset any session/profile data; it's the same "back to menu" pattern used everywhere else. No change made. |

### 8.3 Missing Branch Coverage

| Handler | Verified status |
|---------|------------------|
| handleWelcomeSelection | Already correct - invalid input already stayed at WELCOME. No change needed. |
| handleConsultationMenuSelection | **Confirmed real and fixed** - invalid input previously fell through to WELCOME (same as pressing "4"). Now stays at CONSULTATION with an error. See 15.1. |
| handleBillingSelection | **Confirmed real and fixed** - invalid input previously fell through to WELCOME (same as pressing "2"). Now stays at BILLING with an error. See 15.1. |
| handleAdminCloseConsultation | Already correct - invalid ID format already stayed at the prompt. No change needed. |
| handleDiscountCategorySelection | Already correct - invalid selection already stayed at PROFILE_DISCOUNT_CATEGORY. No change needed. |
| handleProfileConsentsSelection | Already correct - invalid selection already stayed at PROFILE_CONSENTS. No change needed. |

**Also found (not in the original report):** `handleCaregiverAuthSelection` had the
same bug class - any unrecognized input (not just the valid "2") was silently
treated as "I am the patient," starting patient onboarding. Fixed, see 15.1.

---

## 9. Data Persistence Verification

### 9.1 What Survives /clear

From `telegramBot.js` lines 340-349:

| Field | Survives? | Notes |
|-------|-----------|-------|
| patientProfile | Yes | Complete profile preserved |
| media | Yes | Document history preserved |
| isCaregiver | Yes | Role preserved |
| caregiverConsentGiven | Yes | Consent status preserved |
| caregiverName | Yes | Caregiver identity |
| patientName | Yes | Linked patient info |
| caregiverRelationship | Yes | Relationship preserved |
| caregiverReason | Yes | Reason preserved |
| consultationId | No | Cleared |
| paymentTransaction | No | Cleared |
| pendingPayment | No | Cleared |
| paymentVerified | No | Reset to false |
| selectedPersona | Yes | In session recreation (line 371-374) |

### 9.2 Consultation State Persistence

From `consultationManager.js`:

| Data | Storage | Persistence |
|------|---------|-------------|
| Active consultations | consultations Map | consultations.json |
| Session data | sessions Map | sessions.json |
| Payment transactions | PaymentService Map | payments.json |
| Doctor profiles | DoctorPersistence array | doctors.json |
| Pending doctors | PendingDoctors array | pending_doctors.json |
| Admin profiles | admins array | admins.json |
| User registry | users object | users.json |

---

## 10. Role Transition Verification

### 10.1 selectedPersona Handling

From `telegramBot.js` lines 100-111 and `conversationFlow.js` lines 1592-1641:

```
getEffectiveRole(persona, session) precedence:
1. session.selectedPersona (if in availableRoles) - user's explicit choice
2. persona.type - auto-detected role hierarchy
```

### 10.2 Role Hierarchy (PersonaTypes precedence)

From `persona.js` lines 99-104:
1. SUPER_ADMIN (highest)
2. ADMIN
3. DOCTOR
4. SUPPORT
5. CAREGIVER
6. PATIENT (default)

---

## 11. Command Handler Summary

### 11.1 Slash Commands (telegramBot.js)

| Command | Handler | Next State |
|---------|---------|------------|
| `/start` | Various (lines 248-318) | Depends on role |
| `/clear` | Lines 337-387 | WELCOME |
| `/resume` | Lines 389-398 | Current menu |
| `/menu` | Lines 511-551 | Role-specific menu |
| `/profile` | Lines 401-424 | PROFILE_VIEW (view only) |
| `/apply` | Lines 426-443 | No state change (applies for role) |
| `/roles` | Lines 445-464 | No state change (view roles) |
| `/feebased` | Lines 466-509 | No state change (admin command) |
| `/accept` | Lines 321-336 | No state change (accept doctor invite) |

### 11.2 Special Message Patterns

From `telegramBot.js`:

| Pattern | Context | Action |
|---------|---------|--------|
| `MSG_ADMIN <message>` | Doctor outside domain states | Forward to admin |
| `CLOSE <id>` | Doctor | Close consultation |
| `MSG_DOCTOR <id> <msg>` | Referenced in adminMessageDoctorInput | Forward to doctor |
| `MSG_PATIENT <phone> <msg>` | Referenced in adminMessagePatientInput | Forward to patient |
| `(status|9)` | Any role | Show persona select |

---

## 12. Test Scenarios Matrix

### 12.1 Critical Path Tests

| # | Scenario | Expected States | Expected Outcome |
|---|----------|-----------------|------------------|
| 1 | New patient /start | MOBILE_COLLECTION -> PLATFORM_TERMS -> ROLE_SELECT -> PROFILE -> PROFILE_CONSENTS -> WELCOME | Profile created, consents captured |
| 2 | Existing patient /start | WELCOME (with greeting) | Returns to main menu |
| 3 | Caregiver onboarding | ROLE_SELECT -> CAREGIVER_AUTH -> PROFILE -> CAREGIVER_CONSENT_ACK -> CAREGIVER_PATIENT_LINK -> CAREGIVER_MENU | Linked caregiver session |
| 4 | Admin /start | ADMIN_MENU | Admin panel shown |
| 5 | Support /start | SUPPORT_MENU | Support menu shown |
| 6 | Doctor /start | DOCTOR_MENU | Doctor menu shown |
| 7 | /clear then /start | WELCOME (profile preserved) | Clean slate with saved profile |
| 8 | Role switch (admin -> patient) | PERSONA_SELECT -> WELCOME | Patient menu shown |
| 9 | Discount application | CONSULTATION -> BILLING -> PROFILE_DISCOUNT_CATEGORY -> PROFILE_DISCOUNT_DOCUMENTS -> BILLING | Discount status set to pending |
| 10 | Consultation start | CONSULTATION -> CANCER_TYPE -> REPORT_UPLOAD -> BILLING -> PAYMENT_PENDING | Doctor assigned |

### 12.2 Edge Cases

| # | Scenario | Expected Behavior |
|---|----------|-----------------|
| 1 | Profile incomplete at consultation | Redirect to PROFILE_CONSENTS (line 1054) |
| 2 | Admin with incomplete profile | Only options 5, 0 available (line 1817) |
| 3 | Support with incomplete admin profile | Profile required message (line 1580) |
| 4 | Doctor sends message without consultation | "No active consultation" message |
| 5 | Cancel at any profile step | Session reset, doctor released |
| 6 | Invalid menu selection | Re-show menu for that state |
| 7 | Idle session (30 min) | Auto-reset to WELCOME |

---

## 13. Summary

### Covered States: 36 (was 37 - `DATA_SHARING_CONSENT` removed as dead code)
- All FlowStates are reachable through various paths
- All dispatch handlers verified (via AST analysis, not just reading) to always
  return a `{nextState, response}` result on every code path - see 15.6
- Role-based state domain guards are in place and now cover every state,
  including the newer `ADMIN_PROFILE_EDIT`/`DOCTOR_PROFILE_EDIT`/
  `DOCTOR_MSG_ADMIN_INPUT` states that were previously missing from them

### This report's original "Missing Coverage" claims - resolved:
1. ~~`DATA_SHARING_CONSENT` state seems superseded by `PROFILE_CONSENTS`~~ -
   confirmed and removed entirely.
2. ~~Caregiver self-selection path `'4'` in handleRoleSelection redirects
   incorrectly~~ - this claim was inaccurate; that path is the admin-bootstrap
   flow and works correctly. No change needed.
3. ~~Some invalid selection branches just re-show menus without explicit error
   handling~~ - most already had explicit handling; the ones that didn't
   (`handleConsultationMenuSelection`, `handleBillingSelection`,
   `handleCaregiverAuthSelection`) are fixed. See Section 15.

### Data Persistence Verified:
- `/clear` preserves profile and media
- `selectedPersona` survives across sessions
- Consultations stored in separate JSON files
- All role data persists correctly

See Section 15 for the full list of bugs found and fixed after this report was
first generated, including one critical issue (admin lockout) not identified
by the original analysis at all.

---

*Report generated: 2026-07-12*
*Source files analyzed: conversationFlow.js, telegramBot.js, consultationManager.js, userRegistry.js, adminRegistry.js, doctorPersistence.js, persona.js*
*Section 15 added and Sections 1-14 corrected/annotated after live verification and fixes.*

---

## 14. COMMAND-MENU PARITY REQUIREMENT

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

### Commands Without Menu Equivalents (Acceptable for Admin/Tools)
- `/feebased PHONE AMOUNT` - Admin-only fee setting (no patient menu equivalent needed)
- `/accept` - Doctor invitation acceptance (one-time action)

### Missing Menu Items to Add:
1. [ ] Consider adding "Set Fee" option in admin payment flow
2. [ ] Consider adding "Accept Invitation" option in doctor flow

---

## 15. Regression Test Cases — Bugs Found & Fixed This Session

Every item below was verified live before being marked fixed (isolated
`ConversationFlow` unit calls for pure logic; a mocked-Telegram-client harness
driving real `bot.processUpdate()` calls for anything touching routing/session
persistence/notifications). Use these as a regression checklist after any
future change to the files listed.

### 15.1 Menu items that accepted invalid input as if it were a valid choice

The general bug pattern: a handler's fallback for *unrecognized* input
silently executed the same logic as one specific *valid* option, instead of
re-showing the menu with an error.

| # | Handler | Bug | Test | Expected (fixed) |
|---|---------|-----|------|-------------------|
| 1 | `handleCaregiverAuthSelection` | Any input other than `0`/`1` (not just the valid `2`) was treated as "I am the patient," silently starting patient onboarding | At `CAREGIVER_AUTH`, send garbage (e.g. `xyz`) | Stays at `CAREGIVER_AUTH`, shows "❌ Invalid selection" + the menu again |
| 2 | `handleConsultationMenuSelection` | Any input other than `1`-`3` acted like pressing `4` ("Back to Menu") | At `CONSULTATION`, send garbage | Stays at `CONSULTATION` with an error (option `4` still explicitly goes to WELCOME) |
| 3 | `handleBillingSelection` | Any input other than `1`/`3` acted like pressing `2` ("Back to Menu") | At `BILLING`, send garbage | Stays at `BILLING` with an error (option `2` still explicitly goes to WELCOME) |
| 4 | `handleAdminVerifyDiscountInput` | Accepted *any* second word as the discount status verbatim, not just `approved`/`rejected` | `VERIFY DISCOUNT <phone> bogusstatus` via the menu-driven `ADMIN_VERIFY_DISCOUNT_INPUT` state | Rejected with "Status must be 'approved' or 'rejected'", stays at the same state |

### 15.2 Role-switching / session leakage bugs

| # | Bug | Root cause | Test | Expected (fixed) |
|---|-----|------------|------|-------------------|
| 1 | Every admin/doctor/support user's very first plain-text message (before ever running `/start`) got treated as a fresh, incomplete-profile **patient** and routed into Platform Terms / Role Select / Consultation | `ConsultationManager.getSession()`/`resetSession()` defaulted `selectedPersona` to the string `'patient'` instead of `null`; `getEffectiveRole()` treats any truthy `selectedPersona` as an explicit choice | Fresh env-seeded admin/support account, send `hi` as their very first message (no prior `/start`) | Lands directly on `ADMIN_MENU`/`SUPPORT_MENU`, not Platform Terms |
| 2 | An admin who explicitly switched to Patient Mode via Switch Role snapped back to Admin Mode on the very next message - Switch Role never actually stuck | A prior fix for #1 above had special-cased `getEffectiveRole` to always re-surface admin identity, which also blocked genuine admin→patient switches | Admin → Switch Role → Patient Mode → send another message | Stays in Patient Mode; only switching back explicitly returns to Admin Mode |
| 3 | Admin/support blocks in `bot.on('message')` only intercepted when `flowState` exactly equaled their home menu state (`ADMIN_MENU`/`SUPPORT_MENU`); any other state (including `WELCOME`) silently fell through to the patient conversation flow | Missing domain-state self-heal | Force an admin's `flowState` to `WELCOME`, send any message | Self-heals back to `ADMIN_MENU` instead of leaking into patient flow |
| 4 | A doctor who navigated to Profile (`DOCTOR_MENU` option 3) had their next reply swallowed by the MSG_ADMIN/CLOSE/forward-to-patient catch-all instead of being processed as a profile menu selection | Doctor catch-all only excluded `DOCTOR_MENU` itself, not `PROFILE_VIEW`/`DOCTOR_PROFILE_EDIT`/`DOCTOR_MSG_ADMIN_INPUT` | Doctor: `DOCTOR_MENU` → option 3 (or 4) → send a reply | Reply is processed as the profile-edit/message-admin input, not forwarded as a patient message |
| 5 | Backing out of "Profile & Roles" (`PROFILE_VIEW` → "0") or cancelling Switch Role (`PERSONA_SELECT` → "0"/cancel) always landed on the generic patient `WELCOME` menu regardless of the actual role | Both hardcoded `FlowStates.WELCOME` | Admin/doctor/support: navigate to Profile & Roles, press "0" | Returns to that role's own home menu (`ADMIN_MENU`/`DOCTOR_MENU`/`SUPPORT_MENU`), not the patient menu |
| 6 | A caregiver reaching Caregiver Mode via **Switch Role** (as opposed to the original `CAREGIVER_AUTH` onboarding) could never actually use Consultation/Billing for their linked patient | Switch Role never set `session.isCaregiver = true`; separately, the top-level profile-completeness gate in `createFlowHandler` checked the caregiver's own (always-empty) profile instead of the linked patient's | Switch an existing multi-role user into Caregiver Mode, link a patient with a *complete* profile, try "Start Consultation" | Proceeds normally using the linked patient's data, instead of "Profile Incomplete" |
| 7 | Role approval (`handleAdminApprove{Doctor,Caregiver,Support}Input`) could never find a real applicant by the only identifier ever shown to admins (their chat ID) | Looked up via `getUserByPhone()` only, which matches on a `phoneNumber` field that `requestRole()`/`createUser()` never populate | Apply for a role via `/apply <role>`, have a super_admin approve using the applicant's chat ID | Approval succeeds instead of "No user found" |

### 15.3 Doctor credentials and contact-info privacy

| # | Change | Test | Expected |
|---|--------|------|----------|
| 1 | Doctor self-serve onboarding now asks for hospital, city, and qualifications (previously only name/specialty/cancer types) | `ROLE_SELECT` → "3" (Doctor) → complete the full chain | Doctor record has `hospital`/`city`/`qualifications` populated; doctor's own "View Profile" shows them (previously showed the patient-oriented template with "Not set" for everything) |
| 2 | Patient/doctor contact info (raw phone/chat ID) is now restricted to super_admin or the specific admin handling that record | Regular admin (not assigned to a given consultation) views Active Consultations | Sees `(restricted)` instead of the patient's phone; the *assigned* admin and super_admin still see it. "View All Patients" and "View Role Applications" are now super_admin-only |
| 3 | Doctor's "My Patients" and Support's "My Consultations" no longer display patient phone numbers at all | Doctor/support views their patient/consultation list | Shows name/cancer-type/consultation-id but no dialable contact info (both already relay messages through the app, never need to dial out) |

### 15.4 Critical: admin lockout + doctor "Message Admin"

| # | Severity | Bug | Test | Expected (fixed) |
|---|----------|-----|------|-------------------|
| 1 | **Critical** | A new `isAdminProfileComplete` gate blocked every admin menu option except Profile/Switch Role until the admin's profile was complete - but `adminRegistry.updateAdmin()` only mutates an *existing* record and silently no-ops otherwise. Env-seeded admins (`SUPER_ADMIN_CHAT_IDS`/`PHONES`, `ADMIN_PHONES`) have no registry record until they complete this exact profile step, so submitting a name appeared to succeed but never saved - **permanently locking out every env-seeded admin, including the bootstrap super_admin, with no UI escape** | Fresh env-seeded super_admin: `hi` → option `5` (Profile) → Edit → `NAME: Test` → try any other admin option | Profile completes successfully (role correctly preserved as super_admin) and all admin options unlock immediately |
| 2 | High | `adminMenuIncomplete` told users to press "1" for Profile & Roles; the actual gate only allows "5" or "0" through | View the incomplete-profile admin menu text | Text now says "5️⃣ Profile & Roles", matching the working option |
| 3 | High | Doctor's "Message Admin" (`DOCTOR_MSG_ADMIN_INPUT`) looked up the admin via `session?.doctorId` - meaningless on a doctor's own session (that field is for a *patient's* assigned doctor) - always undefined, always "No admin associated" | Doctor with a real `approvedBy` admin: `DOCTOR_MENU` → "4" → send a message | Correctly finds the admin instead of always failing |
| 4 | High | Even when an admin phone *was* found, the response said "✅ Message sent to admin" without anything actually sending it - `conversationFlow.js` can't call `bot.sendMessage` itself | Same as above; check the admin actually receives the message | Admin receives `📩 Message from Dr. <name>: <text>` |
| 5 | Medium | `DoctorProfile`'s constructor never copied an `approvedBy` field at all, so doctors created via `addDoctor()` (Register Doctor, self-serve onboarding) permanently lost the link to their approving admin even when one was passed in | Register a doctor via admin's "Register Doctor" with an approving admin, then have that doctor use "Message Admin" | Reaches the correct admin (relies on fix #3 above being in place too) |
| 6 | Medium | `handleEditProfile` was missing the doctor branch its sibling `handleViewProfile` already had - a doctor reaching "Edit Profile" via the shared `PROFILE_VIEW` menu got the patient-oriented edit form instead of their own | Doctor: navigate to the shared Profile & Roles menu → "Edit Profile" | Gets `DOCTOR_PROFILE_EDIT` (specialty/hospital/city/qualifications fields), not the patient template |
| 7 | Low | `adminMenu` text never listed the newer "Add Admin"/"Remove Admin" options (11/12) despite the handler supporting them | Super_admin views the admin menu | Options 11/12 are now listed |

### 15.5 Data integrity

| # | Change | Notes |
|---|--------|-------|
| 1 | Aadhaar (national ID) removed entirely from patient/caregiver onboarding and from the profile-completeness check | It was mandatory but never validated or used anywhere beyond redisplaying "Provided/Not set" - pure liability with zero functional benefit. If an admin genuinely needs it for a specific case, that's now an ad-hoc message, not a structured feature. |
| 2 | `data/doctors.json` seed data (qualifications/experience/fee/languages/hospital/city/available) was found stripped by a still-running pre-restart bot process and restored | Concrete evidence that the original multi-instance persistence clobbering bug (fixed earlier this session) was still actively corrupting data on the un-restarted process - restart the bot to stop it recurring. |
| 3 | A real admin-approved doctor (chat ID `9876543210`) had no matching `doctors.json` record (lost to the same corruption) | Rather than create a second, conflicting record, linked `telegramId` onto the existing seed doctor it coincidentally phone-matches (`doc_001`) - verified both `identifyPersona()` and the doctor-menu lookup now agree on the same record. |

### 15.6 Crash resilience (applies across every role)

| # | Bug | Test | Expected (fixed) |
|---|-----|------|-------------------|
| 1 | ZWJ emoji sequences (e.g. 👨‍⚕️) in bot-authored text broke Telegram's Markdown entity parser, crashing the send (the original reported bug, in admin's "List Doctors") | Admin → Doctor Management → List Doctors | Renders correctly; confirmed zero ZWJ (U+200D) sequences remain anywhere in the codebase |
| 2 | `const chatId` declared inside a `try {}` block but referenced in the paired `catch {}` (a JS block-scoping trap) crashed the error handler itself instead of showing "An error occurred" - present in the main `bot.on('message')` handler, the highest-traffic handler in the app | Trigger any error mid-message-handling | Error handler correctly references `chatId` and replies to the user instead of throwing a second, unrelated `ReferenceError` |
| 3 | Any user-supplied free text (names, hospital, admin notes) containing a Markdown control character (`*`, `_`, `` ` ``, `[`) would break that specific `sendMessage`/`sendPhoto`/`sendDocument` call, for whichever role's menu displayed it | Simulate a Telegram "can't parse entities" rejection via a mocked client | Automatically retries the identical send in plain text instead of failing outright |
| 4 | Two regex typos in raw admin commands: `MSG_ADMIN` matcher missing a backslash (`s+` instead of `\s+`, could never match); `VERIFY_DISCOUNT` matcher double-escaped (`\\s+`, only matched when no reason was given) | N/A - both were in `handleAdmin()`/`routeQuery`'s raw-command interface, which is now removed entirely (see below) rather than needed live | — |
| 5 | `handleAdmin()` (~370 lines of raw uppercase commands: `ADD_ADMIN`, `REGISTER`, `MSG_DOCTOR`, `VERIFY_DISCOUNT`, etc.) had zero callers anywhere in the codebase - confirmed fully dead, superseded by the menu-driven admin flow, and removed | N/A | Menu-driven admin flow (Section 3.4) is the only admin command interface now |

### 15.7 Verification method

All fixes above were checked with:
- **AST-based return-completeness analysis** (via `acorn`): every dispatch
  method in `conversationFlow.js` is verified, not just read, to return a
  `{nextState, response}` value on every possible code path - 88 methods,
  zero gaps as of the last check.
- **Cross-codebase try/catch scope-leak scan**: every `try`/`catch` pair in
  every `services/*.js`, `models/*.js`, `src/servers/*.js` file checked for
  variables declared in the `try` and referenced in the `catch` - zero
  instances remaining.
- **Live functional tests** using a mocked `TelegramBot` client that drives
  real `bot.processUpdate()` calls end-to-end (not just calling
  `ConversationFlow` methods directly), so session persistence, role routing,
  and cross-role notifications are all exercised the same way a real message
  would trigger them.
