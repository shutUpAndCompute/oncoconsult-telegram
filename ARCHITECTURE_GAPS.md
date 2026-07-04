# Architecture Gaps & Implementation Issues

**Date**: 2026-07-01  
**Application**: OncoConsult Telegram Bot

---

## FIXED (Phase 1 & UX)

### ✓ Missing Data Files Created
- `data/consultations.json` - Created
- `data/pending_doctors.json` - Created
- `data/admins.json` - Created

### ✓ Hardcoded State Fixed
- Changed `flowState: 'mobile_collection'` to use `FlowStates.WELCOME` constant
- Both default and reset session states now use FlowStates constants

### ✓ Removed Unused Code
- Deleted `services/telegramSender.js` - was never imported
- Removed Socket.IO dependency and `http.createServer` wrapper

### ✓ Error Boundaries Added
- Added try-catch to `bot.on('message')`, `bot.on('photo')`, `bot.on('document')` handlers

### ✓ Health Endpoint
- Added `/health` and `/ready` endpoints in `src/index.js`

### ✓ Phone Normalization Unified
- Created `utils/phone.js` with centralized `normalizePhone` function
- Updated `models/persona.js` and `services/adminRegistry.js` to use shared utility

### ✓ Circular Dependency Resolved
- Moved runtime requires to lazy-cache pattern in persona.js
- Requires are now cached at module level with error handling

### ✓ Menu Numbering Fixed
- Main menu now shows 1-6 options with all handlers implemented

### ✓ API Authentication Enhanced
- Added `ADMIN_API_KEY` support for external API calls
- Routes log admin actions for audit trail

---

## Remaining Issues (Unaddressed)

### Issue: Webhook Endpoint Limited
- `POST /webhook/telegram` processes updates but no full implementation

### Issue: Incomplete Reset Logic
- `resetSession()` field handling inconsistent

### Issue: No Input Validation
- User messages passed directly to handlers

### Issue: Doctor Assignment Race Condition
- Multiple admins could assign same doctor without locking

---

## Execution Plan

### Phase 1-2: COMPLETED
| Task | Status |
|------|--------|
| Create missing JSON files | DONE |
| Add try-catch to async handlers | DONE |
| Fix hardcoded state strings | DONE |
| Remove unused telegramSender.js | DONE |
| Add /health endpoint | DONE |
| Remove Socket.IO dependency | DONE |
| Create phone normalization utils | DONE |
| Consolidate in persona.js | DONE |
| Consolidate in adminRegistry.js | DONE |
| Resolve circular dependency | DONE |
| Fix menu numbering | DONE |
| Add API key authentication | DONE |

### Phase 3: Security Hardening - IN PROGRESS
| Task | Status |
|------|--------|
| Add input validation | Pending |
| Add rate limiting | Pending |

### Phase 4: Test Expansion - IN PROGRESS
| Task | Status |
|------|--------|
| Add test script | DONE |
| Phone normalization tests | DONE |
| Persona detection tests | Pending |
| Conversation flow tests | Pending |

### Phase 5: Production Readiness - PENDING
| Task | Status |
|------|--------|
| Full webhook processing | Pending |
| Structured logging | Pending |
| Graceful shutdown | DONE |
| Consultation cleanup job | DONE