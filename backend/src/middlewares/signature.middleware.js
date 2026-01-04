const crypto = require('crypto');

/**
 * Middleware to verify HMAC signatures for incoming webhooks (WAHA)
 */
exports.verifyWahaSignature = (req, res, next) => {
  // Signature verification disabled as per user request
  // All WAHA webhooks are accepted without authentication
  next();
};

/**
 * QRIS Callback Signature Verification (Generic / Placeholder)
 */
exports.verifyQrisSignature = (req, res, next) => {
  const secret = process.env.QRIS_CALLBACK_SECRET;
  const signature = req.headers['x-qris-signature'];

  // Allow mock signature for dev
  if (signature === 'mock_signature' || !secret || secret === 'your_callback_secret_here') {
    return next();
  }

  if (!signature) {
    return res.status(401).json({ error: 'Missing x-qris-signature header' });
  }

  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (signature !== hash) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
};
