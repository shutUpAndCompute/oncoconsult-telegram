const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class PaymentService {
  constructor() {
    this.dataDir = process.env.DATA_DIR || './data';
    this.paymentsFile = path.join(this.dataDir, 'payments.json');
    this.ensureDataDir();
    this.payments = this.loadPayments();
  }

  ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  loadPayments() {
    try {
      const data = fs.readFileSync(this.paymentsFile, 'utf8');
      return new Map(JSON.parse(data, (key, value) => {
        if (value && typeof value === 'object' && value.__date) {
          return new Date(value.__date);
        }
        return value;
      }));
    } catch (e) {
      return new Map();
    }
  }

  savePayments() {
    try {
      const serialized = JSON.stringify(Array.from(this.payments.entries()), (key, value) => {
        if (value instanceof Date) {
          return { __date: value.toISOString() };
        }
        return value;
      });
      fs.writeFileSync(this.paymentsFile, serialized);
    } catch (e) {
      console.error('Payment save error:', e);
    }
  }

  calculateDiscount(baseAmount, discountPercent) {
    const discount = Math.min(Math.max(discountPercent, 0), 100);
    return Math.round(baseAmount * (1 - discount / 100));
  }

  generatePaymentLinkSync(phoneNumber, amount, discountPercent = 0) {
    const finalAmount = this.calculateDiscount(amount, discountPercent);
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const upiLink = `upi://pay?pa=doctor@upi&pn=Oncology%20Consultation&tid=${transactionId}&tr=${transactionId}&am=${finalAmount}&cu=INR`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    this.payments.set(transactionId, {
      phoneNumber,
      amount: finalAmount,
      originalAmount: amount,
      discountPercent,
      status: 'pending',
      createdAt: new Date(),
      expiresAt
    });
    this.savePayments();

    return {
      transactionId,
      upiLink: `https://pay.upi/${transactionId}`,
      message: `Pay via UPI: ${upiLink}\nOr click: https://pay.upi/${transactionId}\n\n⏳ Link expires in 24 hours.\n💡 Original: ₹${amount} | Discount: ${discountPercent}% | You pay: ₹${finalAmount}`
    };
  }

  async generatePaymentLink(phoneNumber, amount, discountPercent = 0) {
    const finalAmount = this.calculateDiscount(amount, discountPercent);
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const upiLink = `upi://pay?pa=doctor@upi&pn=Oncology%20Consultation&tid=${transactionId}&tr=${transactionId}&am=${finalAmount}&cu=INR`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    this.payments.set(transactionId, {
      phoneNumber,
      amount: finalAmount,
      originalAmount: amount,
      discountPercent,
      status: 'pending',
      createdAt: new Date(),
      expiresAt
    });
    this.savePayments();

    return {
      transactionId,
      upiLink: `https://pay.upi/${transactionId}`,
      message: `Pay via UPI: ${upiLink}\nOr click: https://pay.upi/${transactionId}\n\n⏳ Link expires in 24 hours.\n💡 Original: ₹${amount} | Discount: ${discountPercent}% | You pay: ₹${finalAmount}`
    };
  }

  async verifyPayment(transactionId) {
    const payment = this.payments.get(transactionId);
    if (!payment) return false;
    if (payment.status === 'verified') return true;
    if (payment.expiresAt && new Date() > payment.expiresAt) {
      payment.status = 'expired';
      this.savePayments();
      return false;
    }
    return false;
  }

  isExpired(transactionId) {
    const payment = this.payments.get(transactionId);
    if (!payment) return true;
    if (payment.status === 'verified') return false;
    if (payment.expiresAt && new Date() > payment.expiresAt) {
      payment.status = 'expired';
      this.savePayments();
      return true;
    }
    return false;
  }

  cleanupExpired() {
    const now = new Date();
    for (const [id, payment] of this.payments.entries()) {
      if (payment.status === 'pending' && payment.expiresAt && now > payment.expiresAt) {
        this.payments.delete(id);
      }
    }
    this.savePayments();
  }

  async handlePaymentWebhook(req, res) {
    const signature = req.headers['x-payment-signature'];
    const payload = req.body;
    
    if (!this.verifyWebhookSignature(payload, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const payment = this.payments.get(payload.transactionId);
    if (payment) {
      payment.status = 'verified';
      payment.verifiedAt = new Date();
      this.savePayments();
    }

    return res.json({ success: true });
  }

  verifyPaymentManual(transactionId) {
    const payment = this.payments.get(transactionId);
    if (payment) {
      payment.status = 'verified';
      payment.verifiedAt = new Date();
      this.savePayments();
      return true;
    }
    return false;
  }

  verifyWebhookSignature(payload, signature) {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!secret) return false;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    return signature === expectedSignature;
  }
}

module.exports = PaymentService;