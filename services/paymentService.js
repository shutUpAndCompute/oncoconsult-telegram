const DISCOUNT_TIERS = {
  bpl_ews: 100,
  ayushman_bharat: 100,
  senior_citizen: 50,
  defence_exservicemen: 50,
  paramilitary: 50,
  police: 50,
  pwd: 50,
  sc_st: 25,
  minority_community: 25,
  rural_tribal_resident: 25,
  e_shram: 25,
  farmer: 25,
  government_employee: 25,
  freedom_fighter_dependent: 25,
  healthcare_worker: 25,
  teacher_angadiwadi: 25,
  journalist: 25,
  widow_single_woman: 25,
  none: 0
};
const fs = require('fs');
const crypto = require('crypto');
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

  getDiscountPercentForCategory(category) {
    return DISCOUNT_TIERS[category] || 0;
  }


  generatePaymentLinkSync(phoneNumber, amount = 0, discountPercent = 0) {
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
      expiresAt,
      feePending: amount === 0
    });
    this.savePayments();

    return {
      transactionId,
      upiLink: `https://pay.upi/${transactionId}`,
      message: amount === 0
        ? `Transaction created. Fee will be determined by admin. Transaction ID: ${transactionId}`
        : `Pay via UPI: ${upiLink}\nOr click: https://pay.upi/${transactionId}\n\n⏳ Link expires in 24 hours.\n💡 You pay: ₹${finalAmount}`
    };
  }

  async generatePaymentLink(phoneNumber, amount = 0, discountPercent = 0) {
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
      expiresAt,
      feePending: amount === 0
    });
    this.savePayments();

    return {
      transactionId,
      upiLink: `https://pay.upi/${transactionId}`,
      message: amount === 0 
        ? `Transaction created. Fee will be determined by admin. Transaction ID: ${transactionId}`
        : `Pay via UPI: ${upiLink}\nOr click: https://pay.upi/${transactionId}\n\n⏳ Link expires in 24 hours.\n💡 Amount: ₹${finalAmount}`
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

  setFee(transactionId, amount, adminNote = '') {
    const payment = this.payments.get(transactionId);
    if (!payment) return false;
    
    payment.amount = amount;
    payment.adminNote = adminNote;
    payment.feeSetAt = new Date();
    payment.feePending = false;
    this.savePayments();
    return true;
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
module.exports.DISCOUNT_TIERS = DISCOUNT_TIERS;