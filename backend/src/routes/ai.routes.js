const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const aiTestController = require('../controllers/ai_test.controller');

/**
 * @swagger
 * /api/ai/test-chat:
 *   post:
 *     summary: Test AI chat with knowledge base (RAG)
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 example: "What are the features of your product?"
 *     responses:
 *       200:
 *         description: AI response generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 question:
 *                   type: string
 *                 answer:
 *                   type: string
 *                 timestamp:
 *                   type: string
 */
router.post('/test-chat', auth, aiTestController.testChat);

module.exports = router;
