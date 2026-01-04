const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { verifyQrisSignature } = require('../middlewares/signature.middleware');

// Public callback (Webhook) - No Auth
router.post('/callback', verifyQrisSignature, subscriptionController.handleCallback);

// Protected Routes
router.use(authMiddleware);

router.get('/packages', subscriptionController.listPackages);
router.post('/choose', subscriptionController.choosePackage);
router.get('/status', subscriptionController.getStatus);

module.exports = router;
