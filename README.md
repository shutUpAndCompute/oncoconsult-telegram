# OncoConsult - Telegram Oncology Consultation Platform

A non-profit clinical initiative providing secondary opinions and consultations for cancer patients in India via Telegram.

## BotFather Setup

1. Open Telegram, search for **@BotFather**
2. Send `/newbot` and follow prompts
3. Get your bot TOKEN (format: `123456:ABC-DEF...`)
4. Start chat with your bot: `/start`

## Quick Setup (2 minutes)

```bash
npm install
cp .env.example .env
# Edit .env with your bot token from BotFather
npm run dev  # Runs on port 3001
```

## Environment Variables

```env
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew-fg
ADMIN_PHONES=+919999999999,+918888888888
SUPPORT_PHONES=+917777777777,+916666666666
DATA_DIR=./data
PAYMENT_WEBHOOK_SECRET=your-secret  # Optional: for webhook signature verification
```

## Privacy: Users Cannot See Each Other's Messages

- Each user has a **unique chat ID** with the bot
- Messages are routed via chat ID, not phone number
- Doctor registration uses Telegram chat ID (not phone)
- **No broadcast or group functionality** - all 1:1

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
- **Role Approvals** - View/approve doctor, caregiver, support applications via menu
- **Doctor Management** - Register, invite, list, assign, remove doctors via menu
- **Close Consultation** - End consultations with `/CLOSE CONSULTATION_ID`
- **Fee Management** - Set consultation fees via `/feebased PHONE AMOUNT [NOTE]`

### Doctor Features
- **Consultation Assignment** - Receive assigned patients automatically
- **Message Patients** - Communicate directly within consultation
- **Close Consultations** - End consultations with `/CLOSE CONSULTATION_ID`
- **Admin Messaging** - Contact supervising admin via `MSG_ADMIN <message>`

## Discount System

### Key Rules
- **All discounts are discretionary** - Admin/Super-admin decide amount to maintain profitability
- **Document sharing is MANDATORY** for any discount consideration
- **Patients can opt out** of any offered discount and pay full amount

### Socio-Economic Categories (Indicative - Admin Reference Only)
| Category | Indicative Discount | Required Document |
|----------|--------------------|-------------------|
| BPL/EWS, Ayushman Bharat | 100% | Ration card, Ayushman card |
| Senior Citizen, Defence/Ex-servicemen, Paramilitary, Police, PwD | 50% | Age proof, ECHS/CSD card, UDID |
| SC/ST, Minority, Rural/Tribal, e-Shram, Farmer, Govt Employee, Freedom Fighter dependent, Healthcare Worker, Teacher/Anganwadi, Journalist, Widow/Single Woman | 25% | Caste certificate, Community certificate, Employee ID, etc. |

### Access Control
- **Patients/Caregivers**: See generic discount disclaimer only
- **Admins/Doctors/Super-admins**: Can view full indicative discount tiers

## Mandatory Profile Fields

Patients must provide:
1. **Identity**: Name, Age, Gender, Aadhaar number
2. **Location**: Address, State/District
3. **Medical**: Cancer type, Treating hospital, Treatment status
4. **Emergency**: Contact name, phone number, relationship
5. **Documents**: At least one medical report
6. **Consents**: Teleconsultation, Data sharing, DPDP Act compliance

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
- `/delete` - Request data deletion (DPDP compliance)
- `/profile` - View profile
- `/clear` - Clear chat history (preserves profile/data)
- `/resume` - Resume session

### Admin Commands
- Menu-driven: Role Approvals, Doctor Management (with back/0 navigation)
- `PAY <phone> <amount> <r%> <c%>` - Set consultation fee
- `CLOSE CONSULTATION_ID` - Close consultation
- Slash command equivalents: `/register`, `/approve_doctor`, `/invite_doctor`, `/msg_patient`

### Doctor Commands
- `MSG_ADMIN MESSAGE` - Contact admin
- `CLOSE CONSULTATION_ID` - Close consultation

### Universal
- `/menu` - Show current menu
- `/delete` - Request data deletion per DPDP Act

### Healthcare Compliance
- Medical disclaimer on consultation start (Emergency: Call 108)
- Doctor qualifications displayed during assignment
- Opt-in consent for socio-economic discount data sharing
- Profile completion mandatory before consultation access
- Three mandatory consents: Teleconsultation, Data Sharing, DPDP
- `/apply ROLE` - Apply for role (doctor, caregiver, support)
- `/roles` - View applied roles

## Deployment

```bash
npm install --production
node src/index.js
```

Polling mode works without webhooks. No public URL needed.

## License

MIT License - Non-profit clinical initiative