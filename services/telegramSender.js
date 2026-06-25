const TelegramBot = require('node-telegram-bot-api');

class TelegramSender {
  constructor() {
    this.bot = null;
  }

  initialize(token) {
    this.bot = new TelegramBot(token, { polling: false });
    this.adminPhones = (process.env.ADMIN_PHONES || '').split(',').filter(p => p);
  }

  async sendToPatient(chatId, message) {
    try {
      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Failed to send to patient:', error);
    }
  }

  async forwardFromDoctor(chatId, message, consultationId) {
    try {
      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

      for (const admin of this.adminPhones) {
        try {
          await this.bot.sendMessage(admin, `📋 *Doctor → Patient Copy*\nConsultation: ${consultationId}\n${message}`);
        } catch (e) { /* ignore */ }
      }
    } catch (error) {
      console.error('Failed to forward from doctor:', error);
    }
  }

  async notifyAllAdmins(chatId, sessionData) {
    const adminMessage = `📩 *New Admin Request*\nPatient: ${chatId}\nCancer: ${sessionData.cancerType || 'Not selected'}\nReports: ${sessionData.mediaCount || 0}`;

    for (const admin of this.adminPhones) {
      try {
        await this.bot.sendMessage(admin, adminMessage, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error(`Failed to notify admin ${admin}:`, error);
      }
    }
  }
}

module.exports = TelegramSender;