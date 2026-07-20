# OncoConsult Telegram Bot: Extensive User Manual

Welcome to the OncoConsult Telegram platform! This manual details how to navigate the bot, access consultations, apply for roles, and utilize administrative tools. 

> [!NOTE]
> This platform ensures 100% privacy. All messages are 1-on-1 between you and the bot. 

---

## 1. Getting Started & Safety

### The Universal Rescue Command: `/start`
If you ever get stuck, lose your keyboard, or want to return to the main menu immediately, simply type `/start` and send it to the bot. 
This acts as a universal "Reset to Home" button and will instantly rescue you from any state without losing your profile data.

### The Cancel/Back Button: `0`
Whenever you are inside a menu, typing `0` or tapping the `0️⃣ Back` button will cancel your current action and safely return you to the previous menu.

### Profile Breadcrumbs (🔴)
When you first log in, you will notice a red dot (🔴) next to `Profile & Roles`. This indicator means your medical profile is incomplete. You must complete it before you can start a consultation. Once completed, the red dot will vanish.

---

## 2. Patient & Caregiver Workflows

### Completing Your Profile
1. Tap `Profile & Roles` from the Main Menu.
2. Follow the prompts to enter your Name, Phone Number, and Medical History.
3. **Upload Documents**: You will be asked to upload medical reports (PDF/JPG). These are mandatory for a clinical consultation.

### Applying for Socio-Economic Discounts
OncoConsult offers discretionary discounts for eligible individuals (e.g., BPL, Senior Citizens, Armed Forces).
1. Navigate to `Profile & Roles` -> `Update Profile` -> `Discount Category`.
2. Select your category (Economic, Profession, Social, Age/Health).
3. Select your specific eligibility (e.g., "BPL/Ayushman").
4. **Mandatory**: You must upload proof (e.g., Ration Card) when prompted. If you skip the upload, the discount will be nullified.

### Starting a Consultation
1. Tap `Start Consultation`.
2. Select your Cancer Type.
3. **Doctor Selection**: You will be presented with a list of available doctors who specialize in your cancer type (or who are general oncologists).
4. Tap the number corresponding to your chosen doctor.
5. The system will connect you, and you can begin chatting immediately!

---

## 3. Doctor Workflows

### Onboarding
1. Send `/start` to the bot.
2. Tap `Profile & Roles` -> `Apply for Role` -> `Doctor`.
3. Wait for an Admin to approve your request.
4. Once approved, you will receive an alert: `✅ Invitation accepted! You are now Dr. [Name].`

### Managing Consultations
1. Your Main Menu will now feature a **Doctor Dashboard**.
2. Tap `View Active Consultations` to see patients assigned to you.
3. You can chat freely with the patient. 
4. To end a consultation, type `/CLOSE CONSULTATION_ID`.

---

## 4. Admin & Super Admin Workflows

> [!WARNING]
> Admins possess significant privileges and handle sensitive patient data. Ensure strict adherence to the DPDP Act.

### Role Switching
If you are an Admin but wish to use the bot as a Patient (e.g., for a family member), simply tap `Switch Role` in your Admin dashboard and select `Patient`. Your Admin privileges are saved, and you can switch back at any time.

### Manual Doctor Assignment (Overrides)
If a patient cannot select a doctor, or a doctor is unresponsive, Admins can intervene:
1. Open the Admin Menu.
2. Navigate to `Doctor Management`.
3. Tap **Assign Doctor** or **Reassign Doctor**.
4. The bot will prompt you to enter the `CONSULTATION_ID` and the `DOCTOR_ID` (e.g., `cons_1234 doc_987`).
5. The system will forcefully route the patient to the new doctor and alert both parties.

### Setting Consultation Fees
1. Open the Admin Menu.
2. Tap `Set Fee`.
3. Enter the patient's phone number and the custom fee amount (e.g., `9999999999 500`). This overrides the doctor's standard fee for that specific consultation.

---

## 5. Privacy & Data Deletion
In compliance with the DPDP Act, users have full control over their data:
* **Clear Chat**: Sending `/clear` will erase your conversation history from your screen, but preserve your profile in the database.
* **Full Deletion**: Sending `/delete` will submit a formal request to eradicate your medical profile and all associated data from the OncoConsult servers.
