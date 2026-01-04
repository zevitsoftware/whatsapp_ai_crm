const express = require('express');
const router = express.Router();
const aiProviderController = require('../controllers/ai_provider.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// For now, only authenticated users can manage providers (maybe add admin role check later)
router.use(authMiddleware);

router.post('/', aiProviderController.create);
router.get('/', aiProviderController.list);
router.put('/:id', aiProviderController.update);
router.delete('/:id', aiProviderController.delete);

module.exports = router;
