const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/device.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.post('/', deviceController.create);
router.get('/', deviceController.list);
router.get('/:id/qr', deviceController.getQR);
router.post('/:id/restart', deviceController.restart);
router.delete('/:id', deviceController.delete);

module.exports = router;
