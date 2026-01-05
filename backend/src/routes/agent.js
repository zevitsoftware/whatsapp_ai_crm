const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agent.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/templates', agentController.getTemplates);
router.get('/config', agentController.getConfig);
router.post('/config', agentController.updateConfig);

module.exports = router;
