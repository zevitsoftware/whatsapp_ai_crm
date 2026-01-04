const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const contactController = require('../controllers/contact.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Configure multer for CSV uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/app/shared_media/uploads'); // Docker volume path
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'contacts-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname) === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// All routes require authentication
router.use(authMiddleware);

router.get('/', contactController.list);
router.post('/import', upload.single('file'), contactController.importCSV);
router.delete('/:id', contactController.delete);

module.exports = router;
