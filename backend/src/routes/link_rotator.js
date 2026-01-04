const express = require('express');
const router = express.Router();
const linkRotatorController = require('../controllers/link_rotator.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Public Redirect (No Auth)
router.get('/r/:slug', linkRotatorController.redirect);

// Protected Admin Routes
router.post('/', authMiddleware, linkRotatorController.create);
router.get('/', authMiddleware, linkRotatorController.list);
router.put('/:id', authMiddleware, linkRotatorController.update);
router.delete('/:id', authMiddleware, linkRotatorController.delete);

module.exports = router;
