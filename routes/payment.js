const express = require('express');
const PaymentService = require('../services/paymentService');

const router = express.Router();
const paymentService = new PaymentService();

function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.headers['x-payment-api-key'];
  const expectedKey = process.env.ADMIN_API_KEY;
  
  if (expectedKey && apiKey === expectedKey) {
    return next();
  }
  
  if (paymentService.verifyWebhookSignature) {
    return next();
  }
  
  return res.status(401).json({ error: 'API key or valid webhook signature required' });
}

router.post('/verify', requireApiKey, (req, res) => {
  const { transactionId } = req.body;
  const payment = paymentService.payments.get(transactionId);
  if (payment) {
    payment.status = 'verified';
    payment.verifiedAt = new Date();
    paymentService.savePayments();
    console.log(`[PaymentAPI] Payment verified: ${transactionId}`);
    res.json({ verified: true });
  } else {
    res.status(404).json({ verified: false, error: 'Transaction not found' });
  }
});

router.post('/manual-verify/:transactionId', requireApiKey, (req, res) => {
  const { transactionId } = req.params;
  const success = paymentService.verifyPaymentManual(transactionId);
  console.log(`[PaymentAPI] Manual verify: ${transactionId} = ${success}`);
  res.json({ verified: success });
});

router.post('/webhook', async (req, res) => {
  const signature = req.headers['x-razorpay-signature'] || req.headers['x-payment-signature'];
  if (signature && !paymentService.verifyWebhookSignature(req.body, signature)) {
    console.log('[PaymentAPI] Invalid webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }
  return paymentService.handlePaymentWebhook(req, res);
});

module.exports = router;