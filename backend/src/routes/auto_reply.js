const express = require('express');
const router = express.Router();
const autoReplyController = require('../controllers/auto_reply.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.post('/', autoReplyController.create);
router.get('/', autoReplyController.list);
router.put('/:id', autoReplyController.update);
router.delete('/:id', autoReplyController.delete);

module.exports = router;
