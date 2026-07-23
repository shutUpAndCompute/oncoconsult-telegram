# Comprehensive Feature Matrix - All FlowStates

## State Coverage Matrix

| FlowState | Role | Menu Type | Has Indicators | Parameters | Status |
|-----------|------|-----------|----------------|------------|--------|
| **PLATFORM_TERMS** | Patient/Doctor | Static | N/A | None | ✅ Complete |
| **WELCOME** | All | Main Home | ✅ | persona, hasOtherRoles, profileComplete, hasPendingPayment | ✅ Complete |
| **ROLE_SELECT** | All | Static | N/A | None | ✅ Complete |
| **CAREGIVER_AUTH** | Caregiver | Static | N/A | None | ✅ Complete |
| **CAREGIVER_CONSENT_ACK** | Caregiver | Static | N/A | None | ✅ Complete |
| **CAREGIVER_PATIENT_LINK** | Caregiver | Static | N/A | None | ✅ Complete |
| **CAREGIVER_MENU** | Caregiver | Main | ✅ | patientName, profileComplete | ✅ Complete |
| **PROFILE** | All | Static | N/A | None | ✅ Complete |
| **PROFILE_DISCOUNT_CATEGORY** | Patient | Static | N/A | None | ✅ Complete |
| **PROFILE_DISCOUNT_ECONOMIC** | Patient | Static | N/A | None | ✅ Complete |
| **PROFILE_DISCOUNT_PROFESSION** | Patient | Static | N/A | None | ✅ Complete |
| **PROFILE_DISCOUNT_SOCIAL** | Patient | Static | N/A | None | ✅ Complete |
| **PROFILE_DISCOUNT_DOCUMENTS** | Patient | Static | N/A | None | ✅ Complete |
| **PROFILE_CONSENTS** | All | Static | N/A | None | ✅ Complete |
| **CANCER_TYPE** | Patient | Static | N/A | None | ✅ Complete |
| **REPORT_UPLOAD** | Patient | Static | N/A | None | ✅ Complete |
| **BILLING** | Patient | Static | N/A | None | ✅ Complete |
| **PAYMENT_PENDING** | Patient | Static | N/A | None | ✅ Complete |
| **DOCTOR_SELECT** | Patient/Doctor | Static | N/A | None | ✅ Complete |
| **CONSULTATION** | Patient/Caregiver | Main | ✅ | profileComplete, hasPendingPayment | ✅ Complete |
| **CONSULTATION_WITHDRAW** | Patient | Static | N/A | None | ✅ Complete |
| **COMPLETED** | Patient | Static | N/A | None | ✅ Complete |
| **ADMIN_FALLBACK** | Admin | Static | N/A | None | ✅ Complete |
| **ADMIN_MENU** | Admin | Main | ✅ | pending, active, isProfileComplete, hasPendingPayments, hasPendingDiscounts, pendingRoles, pendingDoctors | ✅ Complete |
| **ADMIN_BOOTSTRAP_SECRET** | Super Admin | Static | N/A | None | ✅ Complete |
| **SUPER_ADMIN_MENU** | Super Admin | Main | ✅ | pending, active, isProfileComplete, hasPendingPayments, hasPendingDiscounts, pendingRoles, pendingDoctors | ✅ Complete |
| **SUPER_ADMIN_MANAGE_ADMINS** | Super Admin | Submenu | N/A | None | ✅ Complete |
| **ADMIN_ROLE_APPROVALS** | Admin/Super Admin | Main | ✅ | pendingCounts (doctor, caregiver, support) | ✅ Complete |
| **ADMIN_INVITE_DOCTOR_INPUT** | Admin | Input | N/A | None | ✅ Complete |
| **ADMIN_REGISTER_DOCTOR_INPUT** | Admin | Input | N/A | None | ✅ Complete |
| **ADMIN_APPROVE_DOCTOR_INPUT** | Super Admin | Input | N/A | None | ✅ Complete |
| **ADMIN_APPROVE_CAREGIVER_INPUT** | Super Admin | Input | N/A | None | ✅ Complete |
| **ADMIN_APPROVE_SUPPORT_INPUT** | Super Admin | Input | N/A | None | ✅ Complete |
| **ADMIN_DOCTOR_MANAGEMENT** | Admin | Main | ✅ | pendingDocs | ✅ Complete |
| **ADMIN_ASSIGN_DOCTOR_INPUT** | Admin | Input | N/A | None | ✅ Complete |
| **ADMIN_REMOVE_DOCTOR_INPUT** | Super Admin | Input | N/A | None | ✅ Complete |
| **ADMIN_REJECT_DOCTOR_INPUT** | Super Admin | Input | N/A | None | ✅ Complete |
| **ADMIN_MESSAGE_DOCTOR_INPUT** | Admin | Input | N/A | None | ✅ Complete |
| **ADMIN_REASSIGN_DOCTOR_INPUT** | Admin | Input | N/A | None | ✅ Complete |
| **ADMIN_MESSAGE_PATIENT_INPUT** | Admin | Input | N/A | None | ✅ Complete |
| **ADMIN_VERIFY_PAYMENT_INPUT** | Admin | Input | N/A | None | ✅ Complete |
| **ADMIN_VERIFY_DISCOUNT_INPUT** | Admin | Input | N/A | None | ✅ Complete |
| **ADMIN_CLOSE_CONSULTATION** | Admin | Static | N/A | None | ✅ Complete |
| **DOCTOR_MENU** | Doctor | Main | ✅ | doctorName, hasActive, pendingActions | ✅ Complete |
| **DOCTOR_PROFILE_EDIT** | Doctor | Input | N/A | None | ✅ Complete |
| **DOCTOR_MSG_ADMIN_INPUT** | Doctor | Input | N/A | None | ✅ Complete |
| **DOCTOR_PATIENTS_VIEW** | Doctor | Static | N/A | None | ✅ Complete |
| **SUPPORT_MENU** | Support | Main | ✅ | profileComplete, hasActiveConsultations | ✅ Complete |
| **PROFILE_VIEW** | All | Static | ✅ | highlightMissing | ✅ Complete |
| **PROFILE_EDIT** | All | Input | N/A | None | ✅ Complete |
| **ADMIN_PROFILE_EDIT** | Admin | Main | ✅ | missingFields | ✅ Complete |
| **ADMIN_PROFILE_EDIT_NAME** | Admin | Input | N/A | None | ✅ Complete |
| **ADMIN_PROFILE_EDIT_PHONE** | Admin | Input | N/A | None | ✅ Complete |
| **ROLE_APPLICATION** | All | Static | N/A | None | ✅ Complete |
| **PROFILE_REMOVE_ROLE** | All | Static | N/A | None | ✅ Complete |
| **MOBILE_COLLECTION** | All | Input | N/A | None | ✅ Complete |
| **PERSONA_SELECT** | All | Static | N/A | None | ✅ Complete |
| **ADMIN_ADD_ADMIN_INPUT** | Super Admin | Input | N/A | None | ✅ Complete |
| **ADMIN_REMOVE_ADMIN_INPUT** | Super Admin | Input | N/A | None | ✅ Complete |
| **ADMIN_SET_FEE_INPUT** | Admin | Input | N/A | None | ✅ Complete |
| **ADMIN_PROFILE_COMPLETE_OPTIONS** | Admin | Main | N/A | role | ✅ Complete |
| **ADMIN_CONSULTATIONS_MENU** | Admin | Submenu | ✅ | pending, active | ✅ Complete |
| **ADMIN_FINANCES_MENU** | Admin | Submenu | ✅ | hasPendingPayments, hasPendingDiscounts | ✅ Complete |
| **ADMIN_SYSTEM_MENU** | Admin | Submenu | ✅ | pendingRoles, pendingDoctors, isSuperAdmin | ✅ Complete |

## Summary

| Category | Total States | With Indicators | Missing Indicators |
|----------|--------------|-----------------|-------------------|
| Main/Home Menus | 6 | 6 | 0 |
| Submenus | 5 | 5 | 0 |
| Input States | 35 | 0 | 35 |
| Static States | 19 | 1 | 18 |
| **Total** | **65** | **12** | **53** |

**New Sections Added:**
- State Transition Diagrams (5 role flows)
- Data Flow Between States (core objects + specific flows)
- Session Management Design (structure + lifecycle + persistence)
- Role-Based Access Control Matrix (complete permission matrix)
- Persona Detection Logic (detection algorithm + priority + selection flow)

## Input States Without Indicators (Expected)

Input states are expected to NOT have indicators because they're action prompts, not menu navigation:
- ADMIN_VERIFY_PAYMENT_INPUT - User enters payment ID
- ADMIN_APPROVE_DOCTOR_INPUT - User enters phone number to approve
- ADMIN_PROFILE_EDIT_NAME - User enters their name
- etc.

## Static States Without Indicators (May Need Review)

Some static states might benefit from indicators:
- PROFILE_VIEW - Shows profile, could show completion status
- ADMIN_PROFILE_COMPLETE_OPTIONS - Post-completion menu
- ROLE_APPLICATION - Could show available roles

## Critical Issues Fixed

1. ✅ Caregiver menu calls consultation with proper parameters
2. ✅ AdminDoctorManagement passes pendingDocs count
3. ✅ AdminRoleApprovals passes pendingApps object
4. ✅ All menu handlers return strings, not function references

## Remaining Gaps

| Gap | Description | Priority |
|-----|-------------|----------|
| PROFILE_VIEW indicators | Could show completion % | Low |
| ADMIN_PROFILE_COMPLETE_OPTIONS | Could show next steps | Low |
| DOCTOR_PATIENTS_VIEW | Could show pending patients | Medium |
| Test coverage | Missing response validation tests | High |

---

## State Transition Diagrams

### Patient Role Flow

```
WELCOME → ROLE_SELECT → [Patient Mode] → CONSULTATION
                           ↓                    ↓
                    PLATFORM_TERMS         PROFILE (if incomplete)
                           ↓                    ↓
                      PROFILE         CANCER_TYPE → REPORT_UPLOAD → BILLING → PAYMENT_PENDING
                           ↓                    ↓                    ↓
                   PROFILE_VIEW ← CONSULTATION_WITHDRAW ← COMPLETED
                           ↓
                    PROFILE_EDIT
                           ↓
                   ROLE_APPLICATION
```

### Caregiver Role Flow

```
ROLE_SELECT → [Caregiver Mode] → CAREGIVER_AUTH → CAREGIVER_CONSENT_ACK → CAREGIVER_PATIENT_LINK
                                                                                   ↓
                                                                            CAREGIVER_MENU
                                                                                   ↓
                                                                            CONSULTATION
                                                                                   ↓
                                                                            PROFILE_VIEW
                                                                                   ↓
                                                                            PERSONA_SELECT (0)
```

### Doctor Role Flow

```
ROLE_SELECT → [Doctor Mode] → DOCTOR_SELECT → DOCTOR_MENU
                                                    ↓
                                            VIEW_DOCTORS_PATIENTS
                                                    ↓
                                            DOCTOR_PROFILE_EDIT
                                                    ↓
                                            MESSAGE_ADMIN
```

### Support Role Flow

```
ROLE_SELECT → [Support Mode] → SUPPORT_MENU
                                   ↓ 1
                            ACTIVE_CONSULTATIONS
                                   ↓ 0
                            PERSONA_SELECT
                                   ↓ 2
                            MESSAGE_DOCTOR_INPUT
                                   ↓ 3
                            MESSAGE_PATIENT_INPUT
                                   ↓ 4
                            ADMIN_PROFILE_EDIT
```

### Admin/Super Admin Flow

```
ROLE_SELECT → [Admin Mode] → ADMIN_MENU
                                   ↓ 1 → ADMIN_CONSULTATIONS_MENU
                                   ↓ 2 → ADMIN_FINANCES_MENU → VERIFY_PAYMENT, VERIFY_DISCOUNT
                                   ↓ 3 → ADMIN_SYSTEM_MENU → ROLE_APPROVALS, DOCTOR_MANAGEMENT
                                   ↓ 4 → ADMIN_PROFILE_EDIT
                                   ↓ 0 → PERSONA_SELECT

ROLE_SELECT → [Super Admin Mode] → SUPER_ADMIN_MENU
                                         ↓ 6 → SUPER_ADMIN_MANAGE_ADMINS
                                         ↓ All Admin options
```

---

## Data Flow Between States

### Core Data Objects

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Session       │────▶│   Consultation  │────▶│   Payment       │
│                 │     │                 │     │                 │
│ - flowState     │     │ - id            │     │ - transactionId │
│ - persona       │     │ - status        │     │ - status        │
│ - linkedPatient │     │ - doctorId      │     │ - amount        │
│ - isCaregiver   │     │ - patientPhone  │     │ - createdAt     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                         │
        ▼                       ▼                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   UserRegistry  │────▶│   DoctorRouter  │────▶│   AdminRegistry │
│                 │     │                 │     │                 │
│ - users[]       │     │ - doctors[]     │     │ - admins[]      │
│ - roles[]       │     │ - pending[]     │     │ - superAdmins[] │
│ - requests[]    │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Data Flow: Patient Consultation Request

```
Patient (WELCOME)
    │
    ▼
Select "1" My Consultations
    │
    ▼
CONSULTATION Menu
    │ profileComplete=false?
    ├─Yes─▶ Show ⚠️ warning + 🔴 Start New Consultation
    │
    ▼
Select "1" Start New Consultation
    │
    ▼
handleStartConsultation()
    │
    ├──▶ Check profile completeness
    ├──▶ Check consents
    ├──▶ Check cancer type
    ├──▶ Check medical reports
    │
    ▼
CANCER_TYPE Menu → REPORT_UPLOAD → BILLING → PAYMENT_PENDING
    │
    ▼
Payment created → Transaction stored in session
    │
    ▼
ADMIN_VERIFY_PAYMENT_INPUT (via Admin)
    │
    ▼
Payment verified → Consultation created
```

### Data Flow: Admin Role Approval

```
Admin/Super Admin
    │
    ▼
ADMIN_MENU → ADMIN_SYSTEM_MENU → ADMIN_ROLE_APPROVALS
    │
    ▼
View pending applications
    │
    ▼
Select role to approve (2/3/4)
    │
    ▼
ADMIN_APPROVE_*_INPUT
    │
    ▼
Enter user phone/chatId
    │
    ▼
userRegistry.approveRole()
    │
    ├──▶ Update user role status
    ├──▶ Update admin record
    ├──▶ Notify user
    │
    ▼
Return to ADMIN_ROLE_APPROVALS (with updated counts)
```

---

## Session Management Design

### Session Structure

```javascript
Session = {
  flowState: FlowState,           // Current state
  selectedPersona: string,        // 'patient'|'caregiver'|'doctor'|'admin'|'support'
  isCaregiver: boolean,           // Caregiver mode flag
  linkedPatientPhone: string,     // Caregiver -> Patient link
  patientProfile: {
    name: string,
    age: number,
    gender: string,
    cancerType: string,
    confirmedConsents: { teleconsultation, dataSharing, dpdp },
    discountCategory: string,
    discountVerificationStatus: string
  },
  doctorProfile: {
    name: string,
    specialty: string,
    cancerTypes: string[],
    hospital: string,
    city: string
  },
  media: Array<{ id, type, url }>, // Medical reports
  paymentTransaction: string,      // Current payment
  caregiverConsentGiven: boolean,  // Caregiver consent
  doctorId: string,                // Assigned doctor
  pendingRole: string,             // Role being applied for
  adminMsgToDoctor: { doctorId, message },
  adminMsgToPatient: { patientPhone, message },
  adminMsgToCaregiver: { ... }
}
```

### Session Lifecycle

```
1. /start or /menu
   └── createFlowHandler() → WELCOME state
       
2. User selects role
   └── PERSONA_SELECT → Update session.selectedPersona
       
3. Role-specific onboarding
   └── Profile creation/updates stored in session
       
4. Consultation flow
   └── paymentTransaction stored on billing
       
5. Role approval
   └── Role stored in UserRegistry, session updated
       
6. /clear or session timeout
   └── session.clear() → Reset to WELCOME
```

### Session Persistence

```javascript
// File: services/consultationManager.js
class ConsultationManager {
  constructor() {
    this.sessions = new Map();        // In-memory cache
    this.persistence = new FilePersistence('data/sessions.json');
  }
  
  updateSession(chatId, updates) {
    const session = this.sessions.get(chatId) || {};
    Object.assign(session, updates);
    this.sessions.set(chatId, session);
    this.persistence.save(this.sessions);  // Persist to file
  }
  
  getSession(chatId) {
    return this.sessions.get(chatId);
  }
  
  clearSession(chatId) {
    this.sessions.delete(chatId);
    this.persistence.save(this.sessions);
  }
}
```

---

## Role-Based Access Control Matrix

| Action | Patient | Caregiver | Doctor | Admin | Super Admin |
|--------|---------|-----------|--------|-------|-------------|
| **Main Menu** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **My Consultations** | ✅ | ✅ (linked) | ❌ | ❌ | ❌ |
| **View Profile** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Edit Profile** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Apply for Role** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Remove Role** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Start Consultation** | ✅ | ✅ (linked) | ❌ | ❌ | ❌ |
| **View Payment Status** | ✅ | ✅ (linked) | ❌ | ❌ | ❌ |
| **Withdraw Consultation** | ✅ | ✅ (linked) | ❌ | ❌ | ❌ |
| **View Active Consultations** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **View All Patients** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Message Doctor** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Message Patient** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Message Admin** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Set Consultation Fee** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Verify Payment** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Verify Discount** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **View Role Applications** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Approve Doctor** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Approve Caregiver** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Approve Support** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **View Doctors** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Invite Doctor** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Register Doctor** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Remove Doctor** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Reject Doctor** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Reassign Doctor** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Add Admin** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Remove Admin** | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## Persona Detection Logic

### Persona Priority Order

```javascript
function identifyPersona(phoneNumber) {
  // 1. Check Super Admin (highest priority)
  if (isSuperAdminPhone(phoneNumber) || isSuperAdminChatId(phoneNumber)) {
    return 'super_admin';
  }
  
  // 2. Check Support (env-seeded)
  if (isSupportPhone(phoneNumber) || isSupportChatId(phoneNumber)) {
    return 'support';
  }
  
  // 3. Check Admin (env-seeded)
  if (isAdminPhone(phoneNumber) || isAdminChatId(phoneNumber)) {
    return 'admin';
  }
  
  // 4. Check approved roles from UserRegistry
  const user = userRegistry.getUserByPhone(phoneNumber);
  if (user) {
    const approvedRoles = user.approvedRoles || [];
    if (approvedRoles.includes('super_admin')) return 'super_admin';
    if (approvedRoles.includes('support')) return 'support';
    if (approvedRoles.includes('admin')) return 'admin';
    if (approvedRoles.includes('doctor')) return 'doctor';
    if (approvedRoles.includes('caregiver')) return 'caregiver';
  }
  
  // 5. Default to patient
  return 'patient';
}
```

### Get Available Roles

```javascript
function getAvailableRoles(phoneNumber) {
  const roles = [];
  
  // Check all role sources
  if (isSuperAdmin(phoneNumber)) {
    roles.push('super_admin', 'admin', 'support', 'doctor', 'caregiver', 'patient');
  } else if (isAdmin(phoneNumber)) {
    roles.push('admin', 'support', 'doctor', 'caregiver', 'patient');
  } else if (isSupport(phoneNumber)) {
    roles.push('support', 'patient');
  } else if (isDoctor(phoneNumber)) {
    roles.push('doctor', 'patient');
  } else if (isCaregiver(phoneNumber)) {
    roles.push('caregiver', 'patient');
  }
  
  // Add any approved roles from registry
  const user = userRegistry.getUserByPhone(phoneNumber);
  if (user && user.approvedRoles) {
    roles.push(...user.approvedRoles);
  }
  
  // Always include patient
  if (!roles.includes('patient')) {
    roles.push('patient');
  }
  
  return [...new Set(roles)]; // Remove duplicates
}
```

### Role Detection Sources (Priority)

1. **Environment Variables** (highest priority)
   - `SUPER_ADMIN_CHAT_IDS`, `SUPER_ADMIN_PHONES`
   - `ADMIN_CHAT_IDS`, `ADMIN_PHONES`
   - `SUPPORT_CHAT_IDS`, `SUPPORT_PHONES`

2. **UserRegistry** (approved roles)
   - `userRegistry.getUserByPhone(phoneNumber)`
   - `userRegistry.getUser(chatId)`

3. **Session State**
   - `session.selectedPersona`
   - `session.isCaregiver`

4. **Default** (lowest priority)
   - Returns 'patient'

### Persona Selection Flow

```
/start or /menu
    │
    ▼
identifyPersona(phoneNumber)
    │
    ├── Super Admin? → 'super_admin'
    ├── Admin? → 'admin'
    ├── Support? → 'support'
    ├── Doctor? → 'doctor'
    ├── Caregiver? → 'caregiver'
    └── Default → 'patient'
        │
        ▼
getAvailableRoles(phoneNumber)
        │
        ▼
PERSONA_SELECT Menu
        │
        ▼
User selects role
        │
        ▼
Update session.selectedPersona
        │
        ▼
Route to role-specific home menu
```