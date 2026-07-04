# OncoConsult Telegram Bot - User Guide

## Bot Identity
- **Bot Name**: OncoConsult
- **Bot Username**: Search Telegram for: OncoCancerBot, OncoQueriesBot, CancerCareIndiaBot, or your custom name set via @BotFather
- **Bot Token**: Set via `TELEGRAM_BOT_TOKEN` environment variable

## Getting Started
Open Telegram and start chatting with OncoConsult. The bot auto-detects your role on first message.

---

## Role Detection

The bot automatically detects your role:
- **Doctors**: Detected if your Telegram ID/phone is registered via admin
- **Admins**: Detected if your phone is in registry (works with +91, 91, or no prefix)
- **Caregivers**: Detected if you're approved in the caregiver registry
- **Patients**: Everyone else gets patient flow automatically

### View Current Role
- Send `9` or type `status` to see your current role at any time

### Switch Roles
- Select option `6` from the main menu or send "switch role"
- Shows all available roles with "(Current)" indicator

---

## For Patients

### Initial Setup
1. Send any message - Auto-welcomed with main menu
2. Select cancer type (option 1) or ask questions
3. Upload medical reports (photos/documents)
4. Request payment via the menu (option 3)

### Patient Menu
- `1` - Select Cancer Type
- `2` - View Pricing
- `3` - Upload Reports
- `4` - My Consultations
- `5` - Talk to Admin
- `6` - Switch Role

### Upload Reports with Tagging
After selecting option `3`, choose the document type:
- `1` - Pathology Report
- `2` - Radiology (CT/MRI)
- `3` - Lab Results
- `4` - Prescription
- `5` - Discharge Summary
- `6` - Biopsy Report
- `7` - Surgical Report
- `8` - Other Document
- `0` - Back to Menu

Then send the image/PDF. Reports are tagged with their type for doctor reference.

### Navigation
- `0` - Return to main menu from any state

---

## For Caregivers

### Registration Flow
1. Send `/start` - Shows "Caregiver not registered" message
2. Contact admin: admin runs `ADD_ADMIN <your_phone>` or registers via API
3. Once approved, send any message to ask questions on behalf of patient

---

## For Doctors

### Registration
Doctors must be registered by an admin:
```
REGISTER <name> <phone> <specialty> <cancers>
```
Example: `REGISTER John Smith 9876543210 oncology lung,breast`

### Starting
1. Send `/start` or any message
2. If registered, see "Doctor Mode" message
3. If not registered, see instructions to ask admin

---

## For Admins

### Initial Setup
Admin access via `ADMIN_PHONES` env variable or added by super admin.

### Admin Menu (on /start)
```
1. List Doctors
2. List Specialties
3. List Cancer Types
4. PAY <phone> <amount> <research%> <commercial%>
5. REGISTER <name> <phone> <specialty> <cancers>
6. ADD_ADMIN <phone> [telegramId] [role]
7. REMOVE_ADMIN <phone>
8. LIST_ADMINS
9. Status (current role)
0. Switch Role
```

### Role-Aware Welcome
When you `/start`, the bot shows: `Super Admin Mode Activated` (or `Admin Mode Activated` for regular admins)

---

## Installation & Setup

```
TELEGRAM_BOT_TOKEN=your_token
ADMIN_PHONES=+919923155706
DATA_DIR=./data
```

Run: `npm start`