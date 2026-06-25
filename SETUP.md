# ONcoconsult Telegram Bot - Setup Requirements

## System Requirements
- Node.js 18+ (LTS recommended)
- npm or yarn

## Quick Install Script (save as setup.sh)

```bash
#!/bin/bash
set -e

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install npm dependencies
npm install --production

# Create .env from example
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env - edit it with your TELEGRAM_BOT_TOKEN"
fi

echo "Setup complete. Edit .env then run: npm start"
```

## Manual Setup

```bash
# 1. Install Node.js (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Clone and install
git clone https://github.com/shutUpAndCompute/oncoconsult-telegram.git
cd oncoconsult-telegram
npm install --production

# 3. Configure
cp .env.example .env
# Edit .env: set TELEGRAM_BOT_TOKEN from BotFather
# Set ADMIN_PHONES with your phone numbers

# 4. Run
npm start
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | From BotFather |
| `ADMIN_PHONES` | Yes | Comma-separated admin phone numbers |
| `SUPPORT_PHONES` | No | Support team phone numbers |
| `TELEGRAM_PORT` | No | Default: 3001 |
| `PAYMENT_WEBHOOK_SECRET` | No | For Razorpay/Stripe webhooks |
| `DATA_DIR` | No | Default: ./data |