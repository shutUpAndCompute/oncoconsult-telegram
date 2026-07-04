# OncoConsult - Telegram Oncology Consultation Platform

A non-profit clinical initiative providing secondary opinions and consultations for cancer patients in India via Telegram.

## Overview

OncoConsult connects patients with oncologists through an interactive Telegram bot, facilitating medical consultations while maintaining data privacy and offering socio-economic based discounts.

## Features

### Patient Features
- **Interactive Profile Creation** - Collects mandatory medical and contact information
- **Consultation Request** - Submit cancer type and medical reports for doctor review
- **Discount Eligibility** - Socio-economic discounts for eligible categories (BPL, Ayushman, Defence, Senior Citizens, PwD, SC/ST, etc.)
- **Role-Based Access** - Switch between Patient and Caregiver modes
- **Document Upload** - Share diagnostic reports, imaging, and medical records
- **/clear & /resume** - Session management commands

### Admin Features
- **Pending Consultations** - Review and assign consultations to doctors
- **Active Consultations** - Monitor ongoing consultations
- **Close Consultation** - End consultations with `/close CONSULTATION_ID`
- **Fee Management** - Set consultation fees via `/feebased PHONE AMOUNT [NOTE]`
- **Doctor Registration** - Register and manage oncologists
- **Role Approval** - Approve/reject doctor and support role applications

### Doctor Features
- **Consultation Assignment** - Receive assigned patients automatically
- **Message Patients** - Communicate directly within consultation
- **Close Consultations** - End consultations with `/CLOSE CONSULTATION_ID`
- **Admin Messaging** - Contact supervising admin via `MSG_ADMIN <message>`

## Discount System

### Automatic Discounts
- **10% base discount** - For patients sharing consultation data and medical reports
- **5% discount** - For patients providing data sharing consent only

### Socio-Economic Categories (Requires Document Verification)
| Category | Discount | Required Document |
|----------|----------|-------------------|
| BPL/EWS, Ayushman Bharat | 100% | Ration card, Ayushman card |
| Senior Citizen, Defence/Ex-servicemen, Paramilitary, Police, PwD | 50% | Age proof, ECHS/CSD card, UDID |
| SC/ST, Minority, Rural/Tribal, e-Shram, Farmer, Govt Employee, Freedom Fighter dependent, Healthcare Worker, Teacher/Anganwadi, Journalist, Widow/Single Woman | 25% | Caste certificate, Community certificate, Employee ID, etc. |

### Access Control
- **Patients/Caregivers**: See generic discount disclaimer only
- **Admins/Doctors/Super-admins**: Can view full discount tiers and apply discretionary discounts

## Mandatory Profile Fields

Patients must provide:
1. **Identity**: Name, Age, Gender, Aadhaar number
2. **Location**: Address, State/District
3. **Medical**: Cancer type, Treating hospital, Treatment status
4. **Emergency**: Contact name, phone number, relationship
5. **Documents**: At least one medical report
6. **Consents**: Teleconsultation, Data sharing, DPDP Act compliance

## Installation

```bash
npm install
```

## Configuration

Create `.env` file with:
```
BOT_TOKEN=your_telegram_bot_token
ADMIN_PHONES=919876543210,919876543211
DATA_DIR=./data
PAYMENT_WEBHOOK_SECRET=your_secret
```

## Usage

```bash
# Start production server
npm start

# Development mode
npm run dev

# Run tests
npm test
```

## File Structure

```
├── src/
│   ├── index.js              # Main entry point
│   └── servers/
│       └── telegramBot.js    # Telegram bot adapter
├── services/
│   ├── conversationFlow.js   # Conversation state management
│   ├── consultationManager.js # Consultation CRUD operations
│   ├── paymentService.js     # Payment handling
│   ├── discountService.js    # Discount logic & access control
│   ├── doctorRouter.js       # Doctor assignment logic
│   └── userRegistry.js       # User profile persistence
├── models/
│   ├── patient.js            # Patient profile model
│   ├── doctor.js             # Doctor model
│   └── report.js             # Report model
├── routes/
│   ├── admin.js              # Admin routes
│   ├── doctor.js             # Doctor routes
│   └── payment.js            # Payment webhook routes
└── data/
    ├── users.json            # User profiles
    ├── consultations.json      # Active consultations
    ├── doctors.json          # Doctor registry
    └── sessions.json         # User sessions
```

## Commands

### Patient Commands
- `/start` - Begin registration
- `/profile` - View profile
- `/clear` - Clear chat history (preserves profile/data)
- `/resume` - Resume session

### Admin Commands
- `/feebased PHONE AMOUNT` - Set consultation fee
- `CLOSE CONSULTATION_ID` - Close consultation
- `REGISTER NAME PHONE SPECIALTY CANCERS` - Register doctor
- `INVITE_DOCTOR NAME PHONE SPECIALTY CANCERS` - Invite doctor
- `APPROVE_DOCTOR ID` - Approve doctor registration
- `MSG_PATIENT PHONE MESSAGE` - Message patient

### Doctor Commands
- `MSG_ADMIN MESSAGE` - Contact admin
- `CLOSE CONSULTATION_ID` - Close consultation

### Universal
- `/menu` - Show current menu
- `/apply ROLE` - Apply for role (doctor, caregiver, support)
- `/roles` - View applied roles

## License

MIT License - Non-profit clinical initiative