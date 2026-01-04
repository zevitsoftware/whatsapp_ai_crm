const { Campaign, CampaignLog, Contact, Device } = require('../models');
const { Queue } = require('bullmq');
const { Op } = require('sequelize');

// Initialize Broadcast Queue
const broadcastQueue = new Queue('broadcast', {
  connection: {
    host: process.env.REDIS_HOST || 'redis',
    port: process.env.REDIS_PORT || 6379
  }
});

// Create Campaign
exports.create = async (req, res) => {
  try {
    const { name, messageTemplate, mediaUrl, mediaType, targetTags, delayMin, delayMax, scheduledAt } = req.body;

    // Validate required fields
    if (!name || !messageTemplate) {
      return res.status(400).json({ error: 'Name and message template are required' });
    }

    // Count target contacts
    const where = { userId: req.user.id, isActive: true };
    if (targetTags && targetTags.length > 0) {
      where.tags = { [Op.overlap]: targetTags };
    }
    const targetCount = await Contact.count({ where });

    if (targetCount === 0) {
      return res.status(400).json({ error: 'No contacts match the target criteria' });
    }

    const campaign = await Campaign.create({
      userId: req.user.id,
      name,
      messageTemplate,
      mediaUrl,
      mediaType,
      targetTags: targetTags || [],
      targetCount,
      delayMin: delayMin || 5,
      delayMax: delayMax || 20,
      scheduledAt: scheduledAt || null,
      status: 'DRAFT'
    });

    res.status(201).json(campaign);

  } catch (error) {
    console.error('Create Campaign Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// List Campaigns
exports.list = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    const where = { userId: req.user.id };
    if (status) where.status = status;

    const { count, rows } = await Campaign.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      campaigns: rows
    });

  } catch (error) {
    console.error('List Campaigns Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get Campaign Details
exports.get = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findOne({
      where: { id, userId: req.user.id }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Get logs summary
    const logStats = await CampaignLog.findAll({
      where: { campaignId: id },
      attributes: [
        'status',
        [require('sequelize').fn('COUNT', '*'), 'count']
      ],
      group: ['status'],
      raw: true
    });

    res.json({
      ...campaign.toJSON(),
      stats: logStats
    });

  } catch (error) {
    console.error('Get Campaign Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Start Campaign
exports.start = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findOne({
      where: { id, userId: req.user.id }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status !== 'DRAFT' && campaign.status !== 'PAUSED') {
      return res.status(400).json({ error: 'Campaign cannot be started from current status' });
    }

    // Check if user has active devices
    const activeDevices = await Device.count({
      where: { userId: req.user.id, status: 'WORKING' }
    });

    if (activeDevices === 0) {
      return res.status(400).json({ error: 'No active WhatsApp devices available' });
    }

    // Get target contacts
    const where = { userId: req.user.id, isActive: true };
    if (campaign.targetTags && campaign.targetTags.length > 0) {
      where.tags = { [Op.overlap]: campaign.targetTags };
    }

    const contacts = await Contact.findAll({ where });

    // Create campaign logs and queue jobs
    const jobs = [];
    for (const contact of contacts) {
      // Create log entry
      const log = await CampaignLog.create({
        campaignId: campaign.id,
        contactId: contact.id,
        phoneNumber: contact.phoneNumber,
        status: 'QUEUED'
      });

      // Add to queue
      jobs.push({
        name: 'send-message',
        data: {
          campaignId: campaign.id,
          logId: log.id,
          contactId: contact.id,
          userId: req.user.id
        },
        opts: {
          delay: Math.floor(Math.random() * (campaign.delayMax - campaign.delayMin + 1) + campaign.delayMin) * 1000
        }
      });
    }

    await broadcastQueue.addBulk(jobs);

    // Update campaign status
    campaign.status = 'PROCESSING';
    campaign.startedAt = new Date();
    await campaign.save();

    res.json({
      message: 'Campaign started',
      campaign,
      queuedJobs: jobs.length
    });

  } catch (error) {
    console.error('Start Campaign Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Pause Campaign
exports.pause = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findOne({
      where: { id, userId: req.user.id }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status !== 'PROCESSING') {
      return res.status(400).json({ error: 'Only processing campaigns can be paused' });
    }

    campaign.status = 'PAUSED';
    await campaign.save();

    res.json({ message: 'Campaign paused', campaign });

  } catch (error) {
    console.error('Pause Campaign Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete Campaign
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findOne({
      where: { id, userId: req.user.id }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status === 'PROCESSING') {
      return res.status(400).json({ error: 'Cannot delete a running campaign. Pause it first.' });
    }

    await campaign.destroy();
    res.json({ message: 'Campaign deleted successfully' });

  } catch (error) {
    console.error('Delete Campaign Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
