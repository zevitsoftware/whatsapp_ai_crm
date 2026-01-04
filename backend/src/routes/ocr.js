const express = require('express');
const router = express.Router();
const ocrService = require('../services/ocr.service');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads to shared_media
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.SHARED_MEDIA_PATH || path.join(__dirname, '../../shared_media');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF are allowed.'));
    }
  }
});

/**
 * GET /api/ocr/health
 * Check OCR service health
 */
router.get('/health', async (req, res) => {
  try {
    const isHealthy = await ocrService.healthCheck();
    
    if (isHealthy) {
      res.json({
        success: true,
        status: 'healthy',
        service: 'OCR Service',
        url: process.env.OCR_SERVICE_URL
      });
    } else {
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        service: 'OCR Service',
        url: process.env.OCR_SERVICE_URL
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/ocr/upload
 * Upload and scan a file
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    console.log(`📤 File uploaded: ${req.file.filename}`);

    // Scan the uploaded file
    const result = await ocrService.scanFile(req.file.path);

    res.json({
      success: true,
      message: 'File scanned successfully',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        path: req.file.path
      },
      ocr: result
    });

  } catch (error) {
    console.error('❌ OCR upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/ocr/scan
 * Scan a file from shared_media directory
 */
router.post('/scan', async (req, res) => {
  try {
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({
        success: false,
        error: 'Filename is required'
      });
    }

    // Scan the file
    const result = await ocrService.scanSharedFile(filename);

    res.json({
      success: true,
      message: 'File scanned successfully',
      ocr: result
    });

  } catch (error) {
    console.error('❌ OCR scan error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/ocr/extract-text
 * Extract only text from a file
 */
router.post('/extract-text', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Extract text only
    const text = await ocrService.extractText(req.file.path);

    res.json({
      success: true,
      text: text,
      filename: req.file.filename
    });

  } catch (error) {
    console.error('❌ OCR extract text error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
