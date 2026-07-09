const dotenv = require('dotenv');
require('dns').setDefaultResultOrder('ipv4first');
dotenv.config();
const express = require('express');
const TelegramAdapter = require('./servers/telegramBot');
const ConsultationManager = require('../services/consultationManager');

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api/payments', require('../routes/payment'));
app.use('/api/doctor', require('../routes/doctor'));
app.use('/api/master-data', require('../routes/masterData'));
app.use('/api/admin', require('../routes/admin'));

app.get('/health', (req, res) => {
  const consultationManager = new ConsultationManager();
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    pendingConsultations: consultationManager.consultations.size,
    sessions: consultationManager.sessions.size
  });
});

app.get('/ready', (req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

app.post('/webhook/telegram', (req, res) => {
  const signature = req.headers['x-telegram-bot-api-secret-token'];
  const expectedToken = process.env.TELEGRAM_WEBHOOK_SECRET;
  
  if (expectedToken && signature !== expectedToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const update = req.body;
  if (update) {
    console.log(`[Webhook] Received update: ${JSON.stringify(update).substring(0, 100)}...`);
  }
  res.sendStatus(200);
});

let tgAdapter;
let server;
const consultationManager = new ConsultationManager();

// Periodic cleanup (every 6 hours)
setInterval(() => {
  consultationManager.cleanupAllStale(24, 1440);
}, 6 * 60 * 60 * 1000).unref();

// Manual cleanup endpoint (for admin use)
app.post('/api/admin/cleanup', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const result = consultationManager.cleanupAllStale();
  res.json({ success: true, cleaned: result });
});

async function start() {
  if (process.env.TELEGRAM_BOT_TOKEN) {
    tgAdapter = new TelegramAdapter();
    try {
      await tgAdapter.initialize(process.env.TELEGRAM_BOT_TOKEN);
    } catch (err) {
      console.error('Telegram bot init failed:', err);
      process.exit(1);
    }
  }

  const PORT = process.env.TELEGRAM_PORT || 3001;
  server = app.listen(PORT, () => {
    console.log(`Telegram server running on port ${PORT}`);
  });
}

process.on('SIGTERM', () => {
  if (server) {
    server.close(() => {
      console.log('Server closed gracefully');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  if (server) {
    server.close(() => {
      console.log('Server closed gracefully');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

start();

module.exports = { app, tgAdapter, server };
