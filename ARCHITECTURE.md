# High-Level Architecture - OncoConsult Telegram Bot

## System Overview

```mermaid
flowchart TB
    subgraph "External"
        TG[Telegram API]
        USER[Patients/Caregivers/Doctors/Admins]
    end

    subgraph "OncoConsult"
        subgraph "Entry Layer"
            BOT[Telegram Bot<br/>telegramBot.js]
            HTTP[HTTP Server<br/>Express 3001]
        end

        subgraph "Core Services"
            CF[ConversationFlow<br/>State Machine]
            PER[Persona Detection<br/>persona.js]
            CM[ConsultationManager<br/>consultations/sessions]
            DR[DoctorRouter<br/>Assignment Logic]
        end

        subgraph "Persistence"
            DB[(JSON Files)]
            USERS[(users.json)]
            DOCS[(doctors.json)]
            CONS[(consultations.json)]
            ADMIN[(admins.json)]
        end

        subgraph "Business Logic"
            PS[PaymentService]
            DS[DiscountService]
            UR[UserRegistry]
        end
    end

    USER <-->|Messages| TG
    TG --> BOT
    BOT --> HTTP
    HTTP --> CF
    CF --> PER
    CF --> CM
    CF --> DR
    CM --> DB
    DR --> DOCS
    UR --> USERS
    PS --> PS
    DS --> PS

    style DB fill:#f9f,stroke:#333
    style HTTP fill:#bbf,stroke:#333
```

## Low-Level Component Architecture

```mermaid
flowchart LR
    subgraph "Message Flow"
        M1[TG Message] --> H{Handler}
        H --> H1[Text Handler]
        H --> H2[Photo Handler]
        H --> H3[Document Handler]
        H --> H4[Callback Handler]
    end

    subgraph "Processing Pipeline"
        H1 & H2 & H3 --> P[persona.detect]
        P --> S[session.getOrCreate]
        S --> CF[conversationFlow.process]
        CF --> A{Actions}
        A --> MSG[sendTelegramMessage]
        A --> UPD[updateSession]
        A --> REG[registry.update]
    end

    subgraph "State Machine"
        CF --> FSM[FlowState Machine]
        FSM --> MENU[Menu Prompts]
        FSM --> HAND[State Handlers]
        HAND --> BILL[Billing]
        HAND --> CONS[Consultation]
        HAND --> ADMIN[Admin Actions]
        HAND --> PROFILE[Profile Flow]
    end

    style FSM fill:#ffd,stroke:#333
```

---

# Persona Usage Documentation

## Patient Persona

### Commands & Menus

```
/start → Platform Terms → Role Selection → Profile Flow → Consents → Main Menu
```

**Main Menu:**
```
1️⃣ Select Cancer Type
2️⃣ View Pricing
3️⃣ Upload Reports
4️⃣ My Consultations
5️⃣ Admin Help
6️⃣ Profile & Roles
7️⃣ Clear History
0️⃣ Back (N/A)
```

**Cancer Type Selection:**
- 8 cancer types available (Breast, Lung, Prostate, etc.)
- Selection stored in session for doctor matching

**Profile Flow (8 steps):**
```mermaid
flowchart TD
    P1[Name] --> P2[Age]
    P2 --> P3[Gender]
    P3 --> P4[Cancer Type]
    P4 --> P5[Treating Hospital]
    P5 --> P6[Treatment Status]
    P6 --> P7[Emergency Contact]
    P7 --> P8[Platform Terms]
    P8 --> CONSENT[Consents Required]
    CONSENT --> C1[Teleconsultation]
    CONSENT --> C2[Data Sharing]
    CONSENT --> C3[DPDP Act]
```

**Consents Required:**
1. Teleconsultation consent - medical consultation via chat
2. Data sharing consent - for research/commercial use (OPT-IN)
3. DPDP Act consent - data processing agreement

---

## Caregiver Persona

### Commands & Menus

```
/start → Role Selection (2) → Caregiver Auth → Profile Flow
```

**Caregiver Authorization:**
```
1️⃣ I am authorized caregiver
2️⃣ I am the patient
```

**Caregiver Profile Flow:**
```mermaid
flowchart TD
    CG1[Caregiver Name] --> CG2[Patient Phone]
    CG2 --> CG3[Relationship]
    CG3 --> CG4[Reason for Care]
    CG4 --> P1[Patient Name]
    P1 --> P2[Patient Age]
    P2 --> P3[Patient Gender]
    P3 --> P4[Location]
    P4 --> CONSENT[Consents]
```

**After Linking:**
- Uses patient's main menu with caregiver context
- Can manage linked patient's consultations
- Cannot apply for other roles

---

## Doctor Persona

### Commands & Menus

```
/start → Register/Invitation Path → Active Consultations
```

**Registration Paths:**
1. **Self-register**: `/register` → Pending → Admin Approval
2. **Invited**: Admin `INVITE_DOCTOR` → `/accept` → Active

**Doctor Menu:**
```
1️⃣ My Patients
2️⃣ Active Consultations
3️⃣ Profile
0️⃣ Switch Role
```

**During Consultation:**
- Reply to messages auto-routed to patient
- Only sees assigned patients
- Can message admin via `MSG_ADMIN`

---

## Admin Persona

### Commands & Menus

```
/start → Admin Menu → All Management Functions
```

**Admin Menu:**
```
1️⃣ Pending Requests (Payment Approvals)
2️⃣ Active Consultations
3️⃣ Role Approvals
4️⃣ Doctor Management
5️⃣ My Profile
0️⃣ Switch Role
```

**Role Approvals Menu:**
```
1️⃣ View Applications
2️⃣ Approve Doctor
3️⃣ Register Doctor
4️⃣ Invite Doctor
5️⃣ Reject Doctor
6️⃣ Message Doctor
7️⃣ Back to Menu
0️⃣ Back
```

**Doctor Management Menu:**
```
1️⃣ List Doctors
2️⃣ Assign Doctor
3️⃣ Remove Doctor
4️⃣ Message Doctor
5️⃣ Back to Menu
```

### Slash Commands

| Command | Usage | Description |
|---------|-------|-------------|
| `PAY <phone> <amount> <r%> <c%>` | Admin | Set payment with discounts |
| `CLOSE <consultation_id>` | Admin/Doctor | End consultation |
| `INVITE_DOCTOR <name> <specialty> <phone>` | Admin | Invite doctor via Telegram |
| `APPROVE_DOCTOR <phone>` | Admin | Approve pending doctor |
| `REJECT_DOCTOR <phone>` | Admin | Reject doctor application |
| `MSG_PATIENT <phone> <message>` | Admin | Message patient |
| `MSG_DOCTOR <doctor_id> <message>` | Admin | Message doctor |

---

## Super Admin Persona

**Inherited from Admin + Additional:**
- All admin privileges
- Can approve/reject any role
- Can add/remove other admins (`ADD_ADMIN`, `REMOVE_ADMIN`)
- Access via `SUPER_ADMIN_CHAT_IDS` or `SUPER_ADMIN_PHONES` env vars

---

## Data Models

```mermaid
classDiagram
    class User {
        string phoneNumber
        string name
        number age
        string gender
        string pincode
        string city
        string state
        string cancerType
        string treatingHospital
        string treatmentStatus
        string diagnosisDate
        string oncologistName
        EmergencyContact emergencyContact
        object consents
        object confirmedConsents
        array roles
        array linkedPatients
        boolean platformTermsAccepted
    }

    class Doctor {
        string id
        string phoneNumber
        string name
        string specialty
        string[] cancerTypes
        string hospital
        string qualifications
        number consultationFee
        string city
        boolean available
        number activeConsultations
        string approvedBy
        string telegramId
    }

    class Consultation {
        string id
        string patientPhone
        string doctorId
        string status
        array messages
        array rawQueryMedia
        string paymentVerified
        Date createdAt
        Date expiresAt
    }

    User "1..*" -- "1..*" Consultation : has
    Doctor "1..*" -- "0..*" Consultation : assigned
```

---

## Error Handling & Reliability

```mermaid
flowchart TD
    A[TG Message Received] --> B{Try Process}
    B -->|Success| C[Send Response]
    B -->|Error| D[Log Error]
    D --> E[Send Generic Error to User]
    E --> F[Notify Admin]

    G[Inactivity Timeout] --> H{30 min elapsed?}
    H -->|Yes| I[Reset Session]
    I --> J[Release Doctor]
    J --> K[Notify Admin]
```

---

## Payment & Discount Flow

```mermaid
sequenceDiagram
    participant P as Patient
    participant A as Admin
    participant B as Bot
    participant D as Doctor

    P->>B: Request Payment
    B->>A: Notify Payment Request
    A->>B: PAY <phone> <amt> <r%> <c%>
    B->>P: Show 3 Options (Research/Commercial/No Share)
    P->>B: Select Option
    B->>P: Generate UPI Link
    P->>B: Complete Payment
    B->>B: Verify Payment
    B->>P: Connect to Doctor
    B->>D: Notify New Consultation
```

---

## Compliance & Security

### DPDP Compliance
- Opt-in consent for all data sharing
- `/delete` command for data removal
- Platform terms acceptance required
- Consent tracked in `confirmedConsents` object

### Medical Safety
- Emergency disclaimer on consultation start
- "Call 108 for emergencies" displayed
- Doctor qualifications shown during assignment

### Access Control
- Role-based menu generation
- Phone number gating via `normalizePhone()`
- Doctor isolation (only sees assigned patients)
- Admin scoping (only manages approved doctors)