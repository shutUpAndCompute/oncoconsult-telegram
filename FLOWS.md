# Complete Flow Analysis by Persona

## 1. PATIENT (New User)

```
/start (no profile)
    ↓
platform_terms (must accept to continue)
    ↓ "1" (Accept)
role_select
    ↓ "1" (Patient)
profile (step: name)
    ↓ name
    ↓ age
    ↓ gender
    ↓ aadhaar
    ↓ address
    ↓ pincode
    ↓ state
    ↓ diagnosis_date
    ↓ cancer_type
    ↓ oncologist_name
    ↓ treating_hospital
    ↓ treatment_status
    ↓ medical_reports
    ↓ emergency_contact_name
    ↓ emergency_contact_number
    ↓ emergency_contact_relation
    ↓ completed
        ↓ (has profile or profileComplete)
profile_consents
    ↓ "1","2","3" (all consents)
welcome → main_menu
```

### Menu Navigation (After Profile Complete)
```
main_menu
├── 1 → cancer_type
├── 2 → billing
├── 3 → report_upload
├── 4 → consultation
├── 5 → admin_fallback
├── 6 → clear_history (shows message, stays in welcome)
├── 7 → profile_view → profile_menu
│   ├── 1 → view_profile (back to profile_view)
│   ├── 2 → profile_edit
│   │   └── "menu" or "5" → main_menu
│   └── 0 → main_menu
```

**Issue**: Role options 4-8 removed from profile_menu - users can't access My Roles, Remove Role, etc.

---

## 2. PATIENT (Existing User)

```
/start (has profile)
    ↓
platform_terms (if not accepted) OR
welcome (if accepted)
    ↓
main_menu
```

**Issue**: If `platformTermsAccepted=false`, user goes to role_select AFTER accepting terms (should go to main_menu).

---

## 3. CAREGIVER (New User)

```
/start (no profile)
    ↓
platform_terms
    ↓ "1"
role_select
    ↓ "2"
caregiver_auth
    ↓ "1" (I am authorized)
profile (step: caregiver_name)
    ↓ caregiver_name
    ↓ patient_phone
    ↓ caregiver_relationship
    ↓ caregiver_reason
    ↓ name
    ↓ (same as patient profile steps)
    ↓ completed
profile_consents
    ↓ all consents
welcome → caregiver_menu
```

### Caregiver Menu Navigation
```
caregiver_menu
├── 1 → cancer_type
├── 2 → billing
├── 3 → report_upload
├── 4 → consultation
├── 5 → admin_fallback
├── 6 → clear_history
├── 7 → profile_view → profile_menu (same as patient)
└── 0 → welcome (should go to main_menu) ← ISSUE: goes to personaSelect
```

**Issue**: Back navigation goes to personaSelect instead of main_menu

---

## 4. DOCTOR (New User - Self-registered)

```
/start
    ↓
platform_terms → role_select → doctor_profile
    ↓
profile (step: doctor_name)
    ↓ doctor_name → doctor_specialty → doctor_phone → doctor_hospital → doctor_cancers
    ↓ completed
welcome → doctor_menu
    ↓ (doctor request pending)
```

### Doctor Menu Navigation
```
doctor_menu
├── 1 → doctor_status (view doctor profile)
├── 2 → view_linked_patients
├── 3 → profile_view → profile_menu (NEW - should work)
└── 0 → main_menu
```

**Issue**: Profile for doctor uses different fields - needs integration with session

---

## 5. ADMIN (Existing - Pre-configured)

```
/start
    ↓
admin detected via env var or admins.json
    ↓
welcome → admin_menu
    ↓
admin_menu
├── 1 → get_pending_requests
├── 2 → get_active_consultations
├── 3 → admin_role_approvals
├── 4 → admin_doctor_management
├── 5 → profile_view → profile_menu (for admin profile)
└── 0 → switch_role
```

**Issue**: Admin has no profile in userRegistry - profile_menu returns empty profile

---

## BRANCHING & CONVERGING PATHS

### Branches That Converge
1. **Profile Completion** → All paths converge to `profile_consents` → `welcome`
2. **Back Navigation** → Multiple paths lead back to `welcome` or `main_menu`

### Missing Convergences
1. **Profile → Main Menu** after completion (missing `main_menu` after consents)
2. **Caregiver → Main Menu** on back (goes to wrong place)
3. **Doctor Profile Integration** (not connected to session.profileStep)

---

## ISSUES TO FIX

### Critical
- [ ] Caregiver menu option 0 → goes to personaSelect instead of main_menu
- [ ] Admin/My Profile → no profile data exists in session
- [ ] Doctor profile steps don't integrate with existing profile flow

### Minor
- [ ] Profile menu only has View/Edit/Back (removed other features)
- [ ] Existing patient with profile sees role_select after platform terms

---

## STATE FLOW DIAGRAM

```mermaid
flowchart TD
    START[/start] --> PLAT[PLATFORM_TERMS]
    PLAT -->|Accept| ROLE[ROLE_SELECT]
    ROLE --> PAT[Patient] & CARE[Caregiver] & DOC[Doctor] & ADM[Admin]
    
    PAT --> PROF[PROFILE]
    CARE --> CARE_AUTH[CAREGIVER_AUTH] --> PROF
    DOC --> DOC_PROF[PROFILE - doctor steps]
    ADM --> ADMIN_MENU
    
    PROF --> CONSENTS[PROROFILE_CONSENTS]
    CONSENTS -->|All confirmed| WELCOME[WELCOME]
    
    WELCOME --> MAIN[Main Menu]
    MAIN -->|7| PROFILE_VIEW[PROFILE_VIEW]
    PROFILE_VIEW --> PROFILE_MENU[PROFILE_MENU]
    
    style PLAT fill:#ffd
    style ROLE fill:#ffd
    style CONSENTS fill:#ffd
```