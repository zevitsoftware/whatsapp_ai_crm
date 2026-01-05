const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer for Product Images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Docker Volume Path
    const dir = '/app/shared_media/products';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'prod-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 1 * 1024 * 1024 }, // 1MB Limit
    fileFilter: (req, file, cb) => {
        const types = /jpeg|jpg|png/;
        const extName = types.test(path.extname(file.originalname).toLowerCase());
        const mimeType = types.test(file.mimetype);
        if (extName && mimeType) {
            return cb(null, true);
        } else {
            cb(new Error('Only Images (JPEG/JPG/PNG) up to 1MB are allowed'));
        }
    }
});

router.use(authMiddleware);

router.get('/', productController.list);
router.post('/', upload.single('image'), productController.create);
router.put('/:id', upload.single('image'), productController.update);
router.delete('/:id', productController.delete);

module.exports = router;
