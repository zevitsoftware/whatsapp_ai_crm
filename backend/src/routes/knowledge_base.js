const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const knowledgeBaseController = require('../controllers/knowledge_base.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Configure multer for Knowledge Base uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = '/app/shared_media/knowledge'; // Docker volume path
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'kb-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.pdf', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .PDF and .TXT files are allowed'));
    }
  },
  limits: { fileSize: 2.5 * 1024 * 1024 } // 2.5MB limit
});

// All routes require authentication
router.use(authMiddleware);

router.get('/', knowledgeBaseController.list);
router.post('/upload', upload.single('file'), knowledgeBaseController.upload);
router.delete('/:id', knowledgeBaseController.delete);

module.exports = router;
