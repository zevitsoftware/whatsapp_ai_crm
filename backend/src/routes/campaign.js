const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaign.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(authMiddleware);

router.post('/', campaignController.create);
router.get('/', campaignController.list);
router.get('/:id', campaignController.get);
router.post('/:id/start', campaignController.start);
router.post('/:id/pause', campaignController.pause);
router.delete('/:id', campaignController.delete);

module.exports = router;
