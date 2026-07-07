# Comprehensive Application Review

## Application Structure
```
oncoconsult-telegram/
├── src/
│   ├── servers/telegramBot.js     # Main bot handler (602 lines)
│   └── index.js                   # Express server entry (43 lines)
├── services/
│   ├── conversationFlow.js   # Menu/state machine (1395 lines)
│   ├── consultationManager.js  # Session/consultation persistence (331 lines)
│   ├── doctorPersistence.js         # Doctor data persistence (203 lines)
│   ├── adminRegistry.js             # Admin registry (108 lines)
│   ├── doctorRouter.js              # Doctor assignment logic (85 lines)
│   ├── paymentService.js            # Payment handling (174 lines)
│   ├── caregiverRegistry.js         # Caregiver registry
│   ├── masterDataManager.js         # Master data
│   └── authGuard.js                 # Auth utilities
├── models/
│   ├── persona.js                   # RBAC persona detection (149 lines)
│   ├── doctor.js                    # Doctor model (184 lines)
│   ├── patient.js                   # Patient model
│   ├── report.js                    # Report model
│   └── masterData.js                # Master data model
├── routes/
│   ├── payment.js                  # Payment routes
│   ├── doctor.js                   # Doctor API routes
│   └── masterData.js               # Master data routes
└── middleware/
    └── validation.js                # Validation middleware
```

## Data Flow Summary

### Patient Journey
 ```
 /start → WELCOME → (profile incomplete?) → ROLE_SELECT → PROFILE → 
 CAREGIVER_AUTH (if caregiver) → CAREGIVER_CONSENT_ACK → 
 MAIN MENU (1. My Consultations, 2. Profile & Roles)
   └── My Consultations (streamlined): cancer_type if missing → report_upload if missing → billing
 ```

### Doctor Journey  
```
/start → WELCOME → PERSONA_SELECT(3) → DOCTOR_REGISTER → 
REGISTER_DOCTOR → approval OR INVITE_DOCTOR (admin) → /accept → ACTIVE DOCTOR
```

### Admin Journey
```
/start → WELCOME → ADMIN_MENU → 
  ADMIN_ROLE_APPROVALS (view/approve) OR
  ADMIN_DOCTOR_MANAGEMENT (list/assign/remove) OR
  PROFILE_VIEW → PROFILE_MENU
```

## Key Features Verified

### RBAC Implementation
- Phone normalization (±91/+91/91 handled) via `normalizePhone()`
- Persona detection: Super Admin → Admin → Doctor → Caregiver → Patient
- Admin-Doctor pairing via `approvedBy` field
- Doctor isolation: Only sees consultations for their `doctorId`
- Messaging restrictions: Admin can only `MSG_DOCTOR` they approved (unless Super Admin)

### Menu System
- 14 states defined in `FlowStates`
- All menus have back option (0)
- Status command (9) shows current role
- Persona selection shows active role with 👈 indicator

### Data Persistence
- Sessions: `./data/sessions.json` (Map serialized to object)
- Consultations: `./data/consultations.json`
- Doctors: `./data/doctors.json`
- Pending Doctors: `./data/pending_doctors.json`
- Admins: `./data/admins.json`

### Doctor Registration Flows
1. **Self-registration**: Doctor sends `REGISTER_DOCTOR` → pending status → Super Admin `APPROVE_DOCTOR`
2. **Admin invitation**: Admin sends `INVITE_DOCTOR` → creates invited doctor → doctor sends `/accept` → activated

### Integration Points
- Telegram commands: `/start`, `/register`, `/accept`
- Admin commands: `ADD_ADMIN`, `REMOVE_ADMIN`, `LIST_ADMINS`
- Doctor commands: `MSG_ADMIN`, `MSG_DOCTOR`
- Payment commands: `PAY <phone> <amount> <r%> <c%>`
- Doctor management: `REGISTER`, `INVITE_DOCTOR`, `REMOVE_DOCTOR`, `APPROVE_DOCTOR`, `REJECT_DOCTOR`

## Issues Found & Fixed
1. ✓ Map serialization for sessions/consultations (JSON conversion)
2. ✓ Phone number normalization for admin detection
3. ✓ All menus have back navigation
4. ✓ Profile completion check updated for caregivers
5. ✓ Doctor invitation acceptance flow (`acceptDoctorInvitation`)

## Test Coverage Needed
- [ ] End-to-end patient journey test
- [ ] Doctor invitation acceptance test
- [ ] Admin-Doctor messaging restriction test
- [ ] Profile completion edge cases (caregiver vs patient)
- [ ] Payment flow integration test