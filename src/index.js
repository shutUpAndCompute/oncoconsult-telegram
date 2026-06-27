const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const dotenv = require('dotenv');
const TelegramAdapter = require('./servers/telegramBot');

(async () => {
  dotenv.config();

  const app = express();
  const server = http.createServer(app);
  const io = socketIo(server);

  app.use(express.json());
  app.use('/api/payments', require('../routes/payment'));
  app.use('/api/doctor', require('../routes/doctor'));
  app.use('/api/master-data', require('../routes/masterData'));

  app.post('/webhook/telegram', (req, res) => {
    res.sendStatus(200);
  });

  let tgAdapter;
  if (process.env.TELEGRAM_BOT_TOKEN) {
    tgAdapter = new TelegramAdapter();
    try {
      await tgAdapter.initialize(process.env.TELEGRAM_BOT_TOKEN);
      console.log('Telegram bot initialized');
    } catch (err) {
      console.error('Telegram bot init failed:', err);
    }
  }

  io.on('connection', (socket) => {
    console.log('Doctor connected:', socket.id);
  });

  const PORT = process.env.TELEGRAM_PORT || 3001;
  server.listen(PORT, () => {
    console.log(`Telegram server running on port ${PORT}`);
  });

  module.exports = { app, io, tgAdapter };
})();