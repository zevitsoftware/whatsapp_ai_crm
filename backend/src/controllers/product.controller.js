const { Product, KnowledgeBase, User } = require('../models');
const { knowledgeQueue } = require('../services/knowledge.queue');
const fs = require('fs');
const path = require('path');
const vectorService = require('../services/vector.service');

// Helper to Create/Update Vector Entry
const syncProductToVector = async (product, userId) => {
  try {
    const uploadDir = '/app/shared_media/knowledge';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Format Product Text
    const content = `PRODUCT NAME: ${product.title}
PRICE: Rp ${Number(product.price).toLocaleString('id-ID')} ${product.discount ? `(Discount: ${product.discount})` : ''}
PROMO ENDS: ${product.promoEndDate ? new Date(product.promoEndDate).toLocaleDateString() : '-'}
PRIMARY PRODUCT: ${product.isPrimary ? 'Yes' : 'No'}
DESCRIPTION: ${product.description || '-'}
`;

    // 1. Check if KB entry exists
    let kbEntry = null;
    if (product.vectorId) {
      kbEntry = await KnowledgeBase.findByPk(product.vectorId);
    }

    // Define Filename
    const filename = `product_${product.id}.txt`;
    const filePath = path.join(uploadDir, filename);

    // Save Text File
    fs.writeFileSync(filePath, content);

    if (kbEntry) {
      // Update existing
      kbEntry.fileSize = Buffer.byteLength(content, 'utf8');
      kbEntry.status = 'PROCESSING'; // Re-trigger vectorization
      await kbEntry.save();
    } else {
      // Create new
      kbEntry = await KnowledgeBase.create({
        userId: userId,
        fileName: filename,
        originalName: `[PRODUCT] ${product.title}`,
        filePath: filePath,
        fileSize: Buffer.byteLength(content, 'utf8'),
        mimeType: 'text/plain',
        status: 'PROCESSING',
        metadata: { category: 'product' }
      });
      
      // Link back to product
      product.vectorId = kbEntry.id;
      await product.save();
    }

    // Trigger Queue
    await knowledgeQueue.add('vectorize-file', {
      fileId: kbEntry.id,
      userId: userId
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 }
    });

    console.log(`[Product] Synced ${product.title} to KnowledgeBase ID: ${kbEntry.id}`);

  } catch (error) {
    console.error('[Product] Vector Sync Failed:', error);
  }
};


exports.create = async (req, res) => {
  try {
    const { title, description, price, discount, promoEndDate, isPrimary } = req.body;
    let imagePath = null;

    if (req.file) {
      // Relative path for frontend
      imagePath = `/shared_media/products/${req.file.filename}`;
    }

    const product = await Product.create({
      userId: req.user.id,
      title,
      description,
      price,
      discount,
      promoEndDate: promoEndDate || null,
      isPrimary: isPrimary === 'true',
      imagePath
    });

    // Sync to AI Vector DB (Async)
    syncProductToVector(product, req.user.id);

    res.json(product);
  } catch (error) {
    console.error('Create Product Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.list = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { userId: req.user.id },
      order: [['isPrimary', 'DESC'], ['createdAt', 'DESC']]
    });
    res.json(products);
  } catch (error) {
    console.error('List Products Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findOne({ where: { id, userId: req.user.id } });

    if (!product) return res.status(404).json({ error: 'Product not found' });

    // 1. Delete associated KB Vector logic
    if (product.vectorId) {
      const kbEntry = await KnowledgeBase.findByPk(product.vectorId);
      if (kbEntry) {
         const vectorService = require('../services/vector.service'); // Lazily require
         try {
             await vectorService.deleteFileVectors(kbEntry.id);
         } catch(e) {}
         
         await kbEntry.destroy();
         // Delete file
         if (fs.existsSync(kbEntry.filePath)) fs.unlinkSync(kbEntry.filePath);
      }
    }

    // 2. Delete product image
    if (product.imagePath) {
       const diskPath = product.imagePath.replace('/shared_media', '/app/shared_media');
       if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
    }

    await product.destroy();
    res.json({ message: 'Product deleted' });
  } catch (error) {
    console.error('Delete Product Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, price, discount, promoEndDate, isPrimary } = req.body;
    
    const product = await Product.findOne({ where: { id, userId: req.user.id } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Handle Image Update
    if (req.file) {
      // Delete old image if exists
      if (product.imagePath) {
        const oldDiskPath = product.imagePath.replace('/shared_media', '/app/shared_media');
        if (fs.existsSync(oldDiskPath)) {
          try { fs.unlinkSync(oldDiskPath); } catch (e) { console.error('Error deleting old image:', e); }
        }
      }
      product.imagePath = `/shared_media/products/${req.file.filename}`;
    }

    // Update Fields
    product.title = title || product.title;
    product.description = description !== undefined ? description : product.description;
    product.price = price !== undefined ? price : product.price;
    product.discount = discount !== undefined ? discount : product.discount;
    product.promoEndDate = promoEndDate !== undefined ? (promoEndDate || null) : product.promoEndDate;
    if (isPrimary !== undefined) {
      product.isPrimary = isPrimary === 'true' || isPrimary === true;
    }

    await product.save();

    // Re-sync to AI Vector DB
    syncProductToVector(product, req.user.id);

    res.json(product);
  } catch (error) {
    console.error('Update Product Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
