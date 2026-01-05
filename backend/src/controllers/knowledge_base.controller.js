const { KnowledgeBase } = require('../models');
const fs = require('fs');
const path = require('path');
const { knowledgeQueue } = require('../services/knowledge.queue');

// List Files in Knowledge Base
exports.list = async (req, res) => {
  try {
    const files = await KnowledgeBase.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });

    res.json(files);
  } catch (error) {
    console.error('List Knowledge Base Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Upload Training Data
exports.upload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = await KnowledgeBase.create({
      userId: req.user.id,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      status: 'PROCESSING'
    });

    // Add to vectorization queue
    await knowledgeQueue.add('vectorize-file', {
      fileId: file.id,
      userId: req.user.id
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 }
    });

    res.json(file);
  } catch (error) {
    console.error('Upload Training Data Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create Text Entry (e.g. Products)
exports.createEntry = async (req, res) => {
  try {
    const { title, content, type } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Ensure uploads directory exists (use shared volume)
    const uploadDir = '/app/shared_media/knowledge';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Create file
    const filename = `text_entry_${Date.now()}.txt`;
    const filePath = path.join(uploadDir, filename);
    
    // Write content
    fs.writeFileSync(filePath, content);

    const file = await KnowledgeBase.create({
      userId: req.user.id,
      fileName: filename,
      originalName: type === 'product' ? `[PRODUCT] ${title}` : title,
      filePath: filePath,
      fileSize: Buffer.byteLength(content, 'utf8'),
      mimeType: 'text/plain',
      status: 'PROCESSING'
    });

    // Add to vectorization queue
    await knowledgeQueue.add('vectorize-file', {
      fileId: file.id,
      userId: req.user.id
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 }
    });

    res.json(file);

  } catch (error) {
    console.error('Create Entry Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete Training Data
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const file = await KnowledgeBase.findOne({
      where: { id, userId: req.user.id }
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Remove vectors from Redis
    const vectorService = require('../services/vector.service');
    try {
      await vectorService.deleteFileVectors(file.id);
    } catch (vectorError) {
      console.error('Vector deletion failed (non-fatal):', vectorError);
    }

    // Remove from disk
    if (fs.existsSync(file.filePath)) {
      fs.unlinkSync(file.filePath);
    }

    await file.destroy();

    // Update Knowledge Summary after deletion
    try {
      const allTexts = await vectorService.getAllTexts(req.user.id);
      const aiService = require('../services/ai.service');
      if (allTexts.length > 0) {
        await aiService.generateKnowledgeSummary(req.user.id, allTexts);
      } else {
        // Clear summary if no files left
        const { User } = require('../models');
        await User.update({ knowledgeSummary: '' }, { where: { id: req.user.id } });
      }
    } catch (summaryError) {
      console.error('Failed to update summary after deletion:', summaryError);
    }

    res.json({ message: 'File deleted successfully' });

  } catch (error) {
    console.error('Delete Knowledge Base Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get Knowledge Summary
exports.getSummary = async (req, res) => {
  try {
    const { User } = require('../models');
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ summary: user.knowledgeSummary });
  } catch (error) {
    console.error('Get Summary Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
