# Comprehensive Role-Based Audit - OncoConsult Telegram Bot
**Date**: 2026-07-06
**Auditor**: Automated Analysis

---

## 1. Role Lifecycles

### Patient Lifecycle (Onboarding → Exit)
```
/start → Profile (optional) → Main Menu → 
  └── 1.Cancer Type → Billing → Payment → Consultation
  └── 2.Pricing → Billing (view only)
  └── 3.Upload Reports (anytime)
  └── 4.My Consultations → Connect/Check Status/Withdraw (0=Back)
  └── 5.Admin Help → Fallback state
  └── 6.Clear History → /clear
  └── 7.Profile & Roles → View/Edit/Apply
Exit: /clear (0) or inactivity (30min)
```

### Caregiver Lifecycle
```
/start → Role Selection (2) → Caregiver Auth (1) → 
  Caregiver Profile Name → Patient Phone Link → Main Menu (caregiver context)
  └── Same menu options as patient, acts on behalf of linked patient
Exit: /clear (0) or inactivity (30min)
```

### Doctor Lifecycle
```
Option A: /start → /register (telegram only) → Pending → Super Admin APPROVE_DOCTOR
Option B: Admin INVITE_DOCTOR → /accept → Active Doctor
Active: Messages routed to assigned patients only
Exit: /CLOSE consultation or /clear
```

### Admin Lifecycle
```
/start → Admin Menu (pre-configured phone) →
  1.Pending Requests → List patients awaiting payment
  2.Active Consultations → List ongoing
  3.Role Approvals → View/Approve Doctor/Caregiver/Support + Register/Invite
  4.Doctor Management → List/Assign/Remove/Reject/Message doctors
  5.Profile → View/Edit/Apply/Remove/Switch roles
0.Switch Role → Persona selection
```

### Super Admin Lifecycle
```
Same as Admin + all doctor management privileges
ADD_ADMIN/REMOVE_ADMIN (slash commands)
APPROVE_DOCTOR (via menu or slash)
```

---

## 2. Feature Completeness Matrix

| Feature | Patient | Caregiver | Doctor | Admin | Super Admin | Status |
|---------|---------|-----------|--------|-------|-----------|--------|
| Self-register | ✓ /start | ✓ Apply role | ✓ /register | Pre-configured | Pre-configured | Complete |
| Profile collection | ✓ (7 steps) | ✓ (linked) | N/A | ✓ | ✓ | Complete |
| Cancer selection | ✓ (8 types) | ✓ | - | - | - | Complete |
| Report upload | ✓ | ✓ | - | View only | View only | Complete |
| Payment flow | ✓ | ✓ | - | ✓ (set fee) | ✓ | Complete |
| Consultation | ✓ | ✓ | ✓ (reply) | Manage | Manage | Complete |
| Role apply | ✓ | ✓ | - | Approve | Approve | Complete |
| Role approve | - | - | - | ✓ | ✓ | **Complete** |
| Doctor invite | - | - | - | ✓ | ✓ | **Complete** |
| Doctor register | - | - | ✓ | ✓ | ✓ | **Complete** |
| Patient message | - | - | - | ✓ | ✓ | **Complete** |
| Discount verify | - | - | - | ✓ | ✓ | **Complete** |
| Payment verify | - | - | - | ✓ | ✓ | **Complete** |

---

## 3. UI/UX Consistency Audit

| State | Back Option | Emoji Format | Markdown | Notes |
|-------|-------------|--------------|----------|-------|
| WELCOME | ✓ (6) | ✓ | ✓ | Main menu |
| ROLE_SELECT | 0 | ✓ | ✓ | Patient/Caregiver split |
| CAREGIVER_AUTH | 0 (goes to main) | ✓ | ✓ | Authorization step |
| PROFILE | - | ✓ | ✓ | 8 steps |
| PROFILE_VIEW | ✓ (5) | ✓ | ✓ | **Updated with Remove/Switch** |
| ADMIN_MENU | ✓ (0) | ✓ | ✓ | 5 options |
| ADMIN_ROLE_APPROVALS | ✓ (7) | ✓ | ✓ | **Complete** |
| ADMIN_DOCTOR_MANAGEMENT | ✓ (7) | ✓ | ✓ | **Complete** |

**Issues Found:**
- CAREGIVER_PATIENT_LINK regex pattern `\d{10}` incorrect (missing escape)

---

## 4. Data Persistence Audit

| Data Type | Storage | Methods | Status |
|-----------|---------|---------|--------|
| Users | `./data/users.json` | UserRegistry | ✓ Working |
| Sessions | `./data/sessions.json` | ConsultationManager | ✓ Working |
| Consultations | `./data/consultations.json` | ConsultationManager | ✓ Working |
| Doctors | `./data/doctors.json` | DoctorPersistence | ✓ Working |
| Pending Doctors | `./data/pending_doctors.json` | DoctorPersistence | ✓ Working |
| Admins | `./data/admins.json` | AdminRegistry | ✓ Working |

**Persistence Flow:**
```
User message → ConversationFlow → Session stored in Map → 
On state change → userRegistry.updateUserProfile() → users.json updated
Doctor actions → DoctorPersistence → doctors.json updated
Role changes → userRegistry.approveRole() → users.json updated
```

---

## 5. Role Intersections

| Interaction | Implementation | Data Flow | Status |
|-------------|----------------|-----------|--------|
| Patient → Admin | ADMIN_FALLBACK state | Patient message stored in consultation | ✓ |
| Admin → Patient | MSG_PATIENT (slash/menu) | Direct chatId messaging | ✓ |
| Admin → Doctor | MSG_DOCTOR (slash/menu) | Direct telegramId messaging | ✓ |
| Doctor ↔ Patient | Consultation reply | Consultation.messages[] | ✓ |
| Doctor → Admin | MSG_ADMIN (slash) | Admin CC on messages | ✓ |
| Admin → Assign Doctor | ASSIGN_DOCTOR (slash/menu) | consultation.doctorId set | ✓ |

---

## 6. Pathway Navigation Map

```mermaid
flowchart TD
    A[/start] --> B{Profile Complete?}
    B -->|No| C[ROLE_SELECT]
    C --> C1[Patient Profile Flow]
    C --> C2[Caregiver Auth → Profile]
    C1 --> D[WELCOME Menu]
    C2 --> D
    
    D --> E[CANCER_TYPE]
    D --> F[BILLING]
    D --> G[REPORT_UPLOAD]
    D --> H[CONSULTATION]
    D --> I[PROFILE_VIEW]
    
    H --> H1[Connect via payment]
    H --> H2[Withdraw]
    
    I --> I1[View Profile]
    I --> I2[Edit Profile]
    I --> I3[Apply for Role]
    I --> I4[My Roles]
    I --> I5[Remove Role]
    I --> I6[Switch Role]
    I --> I7[Back to Menu]
```

---
---

## 8. Healthcare Compliance (DPDP & Medical Standards)

### DPDP Compliance
| Requirement | Status | Implementation |
|-------------|--------|--------------|
| Opt-in consent | ✅ | Platform terms require explicit agreement |
| Notice of data use | ✅ | Clear consent for medical/socio-economic data |
| Purpose limitation | ✅ | Data used only for consultation/discounts |
| Right to deletion | ✅ | `/delete` command implemented |
| Data retention policy | ⚠️ | Not automated (manual via delete) |
| Access accountability | ⚠️ | No audit logs |

### Medical Safety
| Requirement | Status | Implementation |
|-------------|--------|--------------|
| Emergency disclaimer | ✅ | "Call 108 for emergencies" on consultation start |
| Doctor qualifications | ✅ | Displayed in consultation assignment |
| Profile mandatory | ✅ | Required before consultation access |
| Consent enforcement | ✅ | All 3 consents required (teleconsultation, data sharing, DPDP) |

### Data Categories
- **Personal Data**: Name, phone, age, gender
- **Medical Data**: Cancer type, reports, consultation notes
- **Socio-economic**: Discount documents (OPT-IN only)
- **Location**: Address, pincode, state

### Deletion Flow
```
User: /delete
System: Clears profile, revokes all roles
Result: User can re-register with /start
```

---

## 9. Recent Changes Log

### 2026-07-07
- Added PLATFORM_TERMS state with data processing agreement
- Added mandatory PROFILE_CONSENTS step in profile flow
- Added /delete command for DPDP data deletion
- Added medical disclaimer to consultation start (108 emergency)
- Added doctor qualifications to consultation assignment
- Implemented PROFILE_PINCODE, PROFILE_DIAGNOSIS_DATE, PROFILE_ONCOLOGIST_NAME
- Added DOCTOR_SELECT and COMPLETED flow states
- Added admin/doctor patient viewing capabilities
- Added doctor reassignment capability


## 7. Test Verification Points

### Patient Path
- [ ] `/start` creates session
- [ ] Profile 1-8 fields collected
- [ ] Cancer type selection works
- [ ] Report upload tagged correctly
- [ ] Payment triggers admin notification
- [ ] Consultation creates after payment

### Caregiver Path
- [ ] Role selection (2) → Caregiver Auth
- [ ] Patient phone linking
- [ ] Uses patient menu with context

### Doctor Path
- [ ] `/register` creates pending request
- [ ] `/accept` activates doctor
- [ ] INVITE_DOCTOR + `/accept` flow
- [ ] Only sees assigned patients

### Admin Path
- [ ] All menu options accessible
- [ ] Role approvals work
- [ ] Doctor management works
- [ ] Messaging works