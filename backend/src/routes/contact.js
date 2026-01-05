const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contact.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(authMiddleware);

router.get('/', contactController.list);
router.get('/:id/chat-history', contactController.getChatHistory);
router.put('/:id', contactController.update);
router.delete('/:id', contactController.delete);
router.delete('/', contactController.bulkDelete);

module.exports = router;
