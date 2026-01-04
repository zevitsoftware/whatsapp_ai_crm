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
    res.json({ message: 'File deleted successfully' });

  } catch (error) {
    console.error('Delete Knowledge Base Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
