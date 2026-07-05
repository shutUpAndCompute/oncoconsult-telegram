# Query Lifecycle Flow - Telegram

**Bot Setup:** See [README.md](README.md) for BotFather configuration and environment variables.

## Role Selection Flow

```mermaid
flowchart TD
    A[User sends /start] --> B{Profile complete?}
    B -->|No| C[Role Selection]
    B -->|Yes| D[Show Welcome Menu]
    
    C --> E["1. I am the patient\n2. Helping someone else"]
    
    E -->|1| F[Patient Profile: Name → Age → Gender → City]
    E -->|2| G[Caregiver Authorization]
    
    G --> H["1. Authorized on behalf\n2. I am the patient"]
    
    H -->|1| I[Caregiver Info: Your name → Patient name → Relationship → Reason]
    H -->|2| F
    
    I --> J[Caregiver Profile: Age → Gender → City]
    J --> D
```

**Caregiver Profile Flow:**
1. Caregiver name (who is sending requests)
2. Patient name (who will receive consultation)
3. Relationship (spouse, child, guardian, friend)
4. Reason (why acting on behalf)
5. Caregiver age, gender, location

**Consent Implications:**
- Caregivers CAN provide data sharing consent with explicit acknowledgment
- Consent recorded with `consentType: 'caregiver'` for audit trail
- Caregiver confirms: "I am authorized and understand consent implications"
- Payment and consultation proceed normally

## Patient Flow

```mermaid
flowchart TD
    A[Patient sends /start] --> B{Profile complete?}
    B -->|No| C[Profile collection]
    B -->|Yes| D[Show Welcome Menu]
    
    C --> E[Ask: Full name]
    E --> F[Ask: Age]
    F --> G[Ask: Gender]
    G --> H[Ask: City]
    H --> D
    
    D --> I["1. Cancer Type\n2. Pricing\n3. Upload Reports\n4. My Consultations\n5. Admin Help"]
    
    I -->|1| J[Cancer Types Menu]
    I -->|2| K[Pricing Menu]
    I -->|3| L[Wait for Photo/Document]
    I -->|4| M[My Consultations Menu]
    I -->|5| N[Admin Fallback]
    
    J --> O[Store cancer type in session]
    K --> P{Request payment?}
    P -->|Yes| Q[Notify admin\nSet PAYMENT_PENDING]
    P -->|No| D
    L --> R[Store fileId in session]
    
    M --> S["1. Connect (after payment)\n2. Check Payment Status\n3. Back to Menu"]
    S -->|1| T{Payment verified?}
    S -->|2| U{Payment transaction exists?}
    
    T -->|No| V[Ask to complete payment]
    T -->|Yes| W[Find available doctor]
    W --> X[Create consultation\nNotify doctor]
    
    U -->|No| Y[Request payment first]
    U -->|Yes/No| Z[Check payment status\nUpdate paymentVerified flag]
```

## Payment & Data Sharing Flow

```mermaid
flowchart TD
    A[Patient selects<br/>Request Payment Link] --> B[Notify admins with context]
    B --> C[Patient sees: Waiting for admin]
    
    C --> D{Admin sends PAY with<br/>researchDiscount% commercialDiscount%}
    D -->|No action| C
    D -->|Yes| E[Store pending payment in session]
    
    E --> F[Show patient 3 data sharing options with final amounts]
    F --> G{Patient selects}
    
    G -->|1. Research use| H[Generate UPI link with researchDiscount%]
    G -->|2. Commercial use| I[Generate UPI link with commercialDiscount%]
    G -->|3. No data sharing| J[Generate UPI link with no discount]
    
    H --> K[Patient pays via UPI]
    I --> K
    J --> K
    
    K --> L{Payment webhook or manual verify?}
    L -->|Verified| M[Set paymentVerified = true]
    L -->|Pending| N[Waiting for payment...]
    
    M --> O[Patient can CONNECT via menu]
```

## Doctor Flow

```mermaid
flowchart TD
    A[Doctor sends message] --> B{Is registered?}
    B -->|No| C[Unauthorized response]
    B -->|Yes| D[Find active consultation]
    
    D -->|No| E[No active consultation]
    D -->|Yes| F{Patient paid?}
    
    F -->|No| G[Payment pending - wait]
    F -->|Yes| H[Forward to patient via chatId]
    
H --> I[Admin CC on message]
 ```

## Admin Flow

```mermaid
flowchart TD
    A[Admin sends /start] --> B[Show Admin Menu]
    B --> C["1. Pending Requests\n2. Active Consultations\n3. Role Approvals\n4. Doctor Management\n5. My Profile\n0. Switch Role"]
    
    C -->|3| D[Role Approvals Menu]
    D --> D1["1. View Role Applications\n2. Approve Doctor\n3. Approve Caregiver\n4. Approve Support\n5. Register Doctor\n6. Invite Doctor\n7. Back"]
    D1 -->|2| D2[Enter phone to approve doctor]
    D1 -->|5| D3[Enter: NAME, SPECIALTY, PHONE, CANCERS]
    D1 -->|6| D4[Enter: NAME, SPECIALTY, PHONE, CANCERS]
    D2 -->|0| D
    D3 -->|0| D
    D4 -->|0| D
    D1 -->|7| B
    
    C -->|4| E[Doctor Management Menu]
    E --> E1["1. List Doctors\n2. List Pending Doctors\n3. Assign Doctor\n4. Remove Doctor\n5. Message Doctor\n6. Back"]
    E1 -->|1| E2[Show all doctors]
    E1 -->|2| E3[Show pending doctor requests]
    E1 -->|3| E4[Assign: CONSULTATION_ID DOCTOR_ID]
    E1 -->|4| E5[Remove: DOCTOR_ID]
    E1 -->|5| E6[Message: DOCTOR_ID MESSAGE]
    E1 -->|6| B
    E2 --> E
    E3 --> E
    E4 --> E
    E5 --> E
    E6 --> E
    
    C -->|0| F[Switch Role Menu]
 ```

## Raw Data Handling

```mermaid
flowchart TD
    A[Patient sends photo/document] --> B[Receive fileId from Telegram]
    B --> C[Store raw reference + metadata]
    C --> D[Add to session.media array]
    
    D --> E{Active consultation exists?}
    E -->|Yes| F[Link raw data to consultation.rawQueryMedia]
    E -->|No| G[Await consultation creation]
```

- No OCR processing
- Media stored as raw Telegram fileId references with receivedAt timestamps
- Doctors review raw files directly

## Session Management

```mermaid
flowchart LR
    A[Patient chatId] --> B{Session exists?}
    B -->|No| C[Create session\nflowState: welcome]
    B -->|Yes| D[Load session]
    
    C --> E[Store in Map]
    D --> F{Profile complete?}
    
    F -->|No| G[Profile collection\nname → age → gender → location]
    F -->|Yes| H[Get flowState]
    
    G --> H
    
    H --> I{cancerType set?}
    I -->|Yes| J[Use for matching]
    I -->|No| K[Await selection]
```

## Profile Collection Flow

```mermaid
flowchart TD
    A[User sends /start] --> B{Profile complete?}
    B -->|No| C[Ask: Full name]
    B -->|Yes| D[Show main menu]
    
    C --> E[Store name → Ask: Age]
    E --> F[Store age → Ask: Gender]
    F --> G[Store gender → Ask: City]
    G --> D
    
    D --> H{Payment request pending?}
    H -->|Yes| I[Show data sharing options]
    H -->|No| J[Show main menu]
```

## Data Sharing Consent & Payment

After admin sends `PAY <phone> <amount> <researchDiscount%> <commercialDiscount%> <note>`, patient receives 3 options with dynamic discounts:

```
💳 *Choose Data Sharing Option*

Consultation fee: ₹1500

1. Yes, allow research use → 30% off → ₹1050
2. Yes, allow commercial use → 15% off → ₹1275
3. No, do not allow → No discount → ₹1500

Reply with 1, 2, or 3
```

Admin sets both discount percentages per consultation based on:
- Case complexity
- Number of queries
- Volume of attached media

## Cancel / Abandonment Flow

```mermaid
flowchart TD
    A[Patient types CANCEL or 0] --> B[Reset session]
    B --> C[Release assigned doctor]
    C --> D[Notify admin]
    D --> E[Return to welcome menu]
    
    F[No activity for 30 minutes] --> G[Auto-detect idle]
    G --> H[Reset session]
    H --> I[Release assigned doctor]
    I --> J[Notify admin: Timeout]
    J --> E
```

**Patient commands:**
- `CANCEL` or `0` from any menu → resets session, releases doctor, notifies admin
- Session is cleared but patient profile is preserved for returning users

**Auto-timeout:**
- If no activity for 30 minutes, next message triggers session reset
- Admin notified with reason: `Inactivity timeout (30 min)` or `User cancelled`

## Payment TTL

```mermaid
flowchart TD
    A[Admin sends PAY] --> B[Generate payment link]
    B --> C[Set expiresAt = now + 24h]
    C --> D[Send to patient]
    
    D --> E{Patient pays?}
    E -->|Within 24h| F[Webhook marks verified]
    E -->|After 24h| G[Payment expired]
    
    F --> H[Patient can CONNECT]
    G --> I[Patient must re-request payment]
```

- Payment link expires in 24 hours
- Expired payments are auto-cleaned on load/verification
- Admin sees `expired` status if patient requests again after TTL

## Admin-Driven Payment Flow

```mermaid
flowchart TD
    A[Patient selects<br/>Request Payment Link] --> B[Notify admins with context]
    B --> C[Patient sees: Waiting for admin]
    
    C --> D{Admin sends PAY with<br/>researchDiscount% commercialDiscount%}
    D -->|No action| C
    D -->|Yes| E[Store pending payment in session]
    
    E --> F[Show patient 3 data sharing options with final amounts]
    F --> G{Patient selects}
    
    G -->|1. Research use| H[Generate link with researchDiscount%]
    G -->|2. Commercial use| I[Generate link with commercialDiscount%]
    G -->|3. No data sharing| J[Generate link with no discount]
    
    H --> K[Patient pays via UPI]
    I --> K
    J --> K
    
    K --> L{Payment webhook?}
    L -->|Verified| M[Patient can CONNECT]
    L -->|Manual verify| M
    
    M --> N[Create consultation]
```

## Payment Request Summary

When patient requests payment, admin receives:
```
📩 Payment Request
Patient: +91XXXXXXXXXX
Name: Rahul
Cancer: Lung
Docs: 2
Consultations: 0
Data Consent: Yes/No

Set discount based on:
- Complexity: general(0-10%), specialized(10-25%), complex(25-40%)
- Query count: more queries = higher discount
- Data volume: more media = higher discount

Reply: PAY <phone> <amount> <researchDiscount%> <commercialDiscount%> <note>
```

## Privacy Model

- Each user has unique `chatId` with bot
- Messages routed by `chatId` (private)
- **Users CANNOT see each other's messages**
- Doctor registration uses `telegramId` (chatId)

## My Consultations Menu Options

When patient selects option 4 (My Consultations) from main menu:

```
📋 *My Consultations*

1️⃣ Connect (after payment)
2️⃣ Check Payment Status
3️⃣ Back to Menu

Reply with number
```

**Option 1 - Connect:** Verifies payment and connects to available doctor if payment is complete

**Option 2 - Check Payment Status:** Shows current payment status and sets paymentVerified flag if payment confirmed
