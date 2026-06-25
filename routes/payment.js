const express = require('express');
const PaymentService = require('../services/paymentService');

const router = express.Router();
const paymentService = new PaymentService();

router.post('/verify', (req, res) => {
  const { transactionId } = req.body;
  const payment = paymentService.payments.get(transactionId);
  if (payment) {
    payment.status = 'verified';
    payment.verifiedAt = new Date();
    paymentService.savePayments();
    res.json({ verified: true });
  } else {
    res.status(404).json({ verified: false, error: 'Transaction not found' });
  }
});

router.post('/manual-verify/:transactionId', (req, res) => {
  const { transactionId } = req.params;
  const success = paymentService.verifyPaymentManual(transactionId);
  res.json({ verified: success });
});

router.post('/webhook', async (req, res) => {
  return paymentService.handlePaymentWebhook(req, res);
});

module.exports = router;
