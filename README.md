# ONcoconsult Telegram

Telegram bot for oncology consultations - no phone verification needed.

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
TELEGRAM_PORT=3001
PAYMENT_WEBHOOK_SECRET=your-secret  # Optional: for Razorpay/Stripe webhook signature verification (leave blank if using manual verification only)
```

## Privacy: Users Cannot See Each Other's Messages

- Each user has a **unique chat ID** with the bot
- Messages are routed via chat ID, not phone number
- Doctor registration uses Telegram chat ID (not phone)
- **No broadcast or group functionality** - all 1:1

## Get Your Telegram Chat ID

Message **@userinfobot** or **@RawDataBot** to get your numeric chat ID.

## Patient Flow

1. Message your bot `/start`
2. Complete profile: name → age → gender → city
3. Get menu: Cancer Type, Pricing, Reports, Connect, Admin
4. Send `1` to select cancer type
5. Send `2` to request payment link
6. Admin sends `PAY <phone> <amount> <researchDiscount%> <commercialDiscount%> <note>` to send payment options
7. Patient chooses data sharing option (1=research, 2=commercial, 3=none)
8. Payment link generated with chosen discount
9. Send `4` or `CONNECT` after payment to connect with doctor
10. Send `5` to talk to admin directly
11. Send `CANCEL` or `0` to cancel and reset session

## Doctor Registration

```bash
curl -X POST http://localhost:3001/api/doctor/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Test",
    "telegramId": "123456789",
    "phoneNumber": "+919876543210",
    "specialty": "medical_oncologist",
    "cancerTypes": ["lung", "liver"]
  }'
```

**Note**: Use `telegramId` (numeric chat ID), not phone number.

## Media Handling

- Send photos → stored in session
- Send documents → stored in session  
- Docs forwarded to doctor after payment verification
- No OCR - doctors view raw images/files

## Deployment

```bash
npm install --production
node src/index.js
```

Polling mode works without webhooks. No public URL needed.

## Connection Mode: Polling vs Webhooks

### Current Setup: Long Polling (Recommended for Testing)

The bot uses **long polling** (`telegramBot.js` line 19):
```javascript
this.bot = new TelegramBot(token, { polling: true });
```

**How it works:**
- Bot connects **outbound** to Telegram servers
- No incoming port exposure needed
- Zero infrastructure overhead

**Start the bot:**
```bash
npm run dev
```

That's it. No ngrok, no port forwarding, no webhook configuration.

### When to Switch to Webhooks

| Factor | Polling | Webhooks |
|--------|---------|----------|
| Concurrency | Single getUpdates connection | Horizontal scaling possible |
| Message rate limit | ~1–30 msgs/sec per bot (Telegram API limit) | Same limit, but distributed |
| Latency | 0.5–2s (depends on timeout param) | Near-instant |
| Reliability | Drops messages if bot restarts | Telegram retries failed webhooks |
| Infrastructure | None needed | Requires public HTTPS URL |

### Webhook Setup (If Needed)

If you need webhooks for production or high-volume testing:

1. **Expose localhost:3001** via tunneling:
```bash
# ngrok (easiest)
ngrok http 3001

# Cloudflare Tunnel (free alternative)
cloudflared tunnel --url http://localhost:3001
```

2. **Set Telegram webhook:**
```bash
curl -F "url=https://your-tunnel-url/webhook/telegram" \
     https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook
```

3. **Note:** Telegram requires HTTPS with valid SSL. ngrok and Cloudflare Tunnel provide this automatically.

### Scalability Thresholds

**Stay with polling** if:
- User count < 50 concurrent
- Development/UAT phase
- Zero infrastructure overhead desired

**Switch to webhooks** if:
- 50+ concurrent patients
- Sub-second response times required
- Multiple bot instances for redundancy
- Load testing near production traffic

For typical testing scenarios, **stay with polling** until you hit actual limits.
## Master Data API

Master data (specialties, cancer types, fees, discounts) is persisted to `data/masterdata.json` on startup and can be configured via API:

### Get Current Master Data
```bash
curl http://localhost:3001/api/master-data
```

### Update Specialties
```bash
curl -X PUT http://localhost:3001/api/master-data/specialties \
  -H "Content-Type: application/json" \
  -d '{"specialties": ["medical_oncologist", "surgical_oncologist", "radiologist"]}'
```

### Update Cancer Types
```bash
curl -X PUT http://localhost:3001/api/master-data/cancer-types \
  -H "Content-Type: application/json" \
  -d '{"cancerTypes": ["lung_oncology", "breast_oncology", "general_oncology"]}'
```

### Update Consultation Fees
```bash
curl -X PUT http://localhost:3001/api/master-data/fees \
  -H "Content-Type: application/json" \
  -d '{"fees": {"firstConsultation": 1500, "followup": 800, "reportReview": 500}}'
```

### Update Default Discounts
```bash
curl -X PUT http://localhost:3001/api/master-data/discounts \
  -H "Content-Type: application/json" \
  -d '{"discounts": {"research": 30, "commercial": 15}}'
```

### Manual Payment Verification
```bash
curl -X POST http://localhost:3001/api/payments/manual-verify/txn_123456789
```

### Doctor Management API

Doctors are persisted to `data/doctors.json`:

```bash
# List all doctors
curl http://localhost:3001/api/doctor/list

# Register new doctor
curl -X POST http://localhost:3001/api/doctor/register \
  -H "Content-Type: application/json" \
  -d '{
    "id": "doc_custom",
    "name": "Dr. Custom",
    "telegramId": "123456789",
    "phoneNumber": "+919876543210",
    "specialty": "medical_oncologist",
    "cancerTypes": ["lung", "breast"],
    "consultationFee": 2000,
    "hospital": "Custom Hospital"
  }'

# Update doctor
curl -X PUT http://localhost:3001/api/doctor/doc_custom \
  -H "Content-Type: application/json" \
  -d '{"available": true}'

# Remove doctor
curl -X DELETE http://localhost:3001/api/doctor/doc_custom
```

### Admin Commands via Telegram

Admin can manage data directly from Telegram:

```
1. List doctors - Show all doctors and availability
2. List specialties - Show available specialties
3. List cancer types - Show supported cancer types
4. PAY <phone> <amount> <research%> <commercial%> <note> - Send payment options to patient
5. REGISTER <name> <telegramId> <specialty> <cancerTypes> - Register new doctor
```

Example to register doctor via Telegram:
```
REGISTER Dr. NewDoctor 123456789 medical_oncologist lung,breast,liver
```

### Caregiver (Non-Patient) Flow

When a caregiver uses the bot on behalf of a patient:

```
1. /start → Role Selection
2. Select "Helping someone else" 
3. Confirm authorization on patient's behalf
4. Enter: Caregiver name → Patient name → Relationship → Reason → Your age → Your gender → Your location
5. Proceed to main menu (caregiver can make payments on behalf of patient)
```

**Note:** Caregivers CAN provide data sharing consent with explicit acknowledgment during the flow.

### Returning Caregiver

Returning caregivers who previously acted on behalf of patients will see their profile preserved. They can:
- Continue with same patient if `patientName` is stored
- Use `/start` to begin new interaction with role selection
