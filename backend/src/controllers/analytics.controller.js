const { Contact, User, Device, ChatLog, sequelize } = require('../models');
const { Op } = require('sequelize');

exports.getOverview = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Contact Stats
    const totalContacts = await Contact.count({ where: { userId } });

    // 2. Device Stats
    const activeDevices = await Device.count({
      where: { userId, status: 'WORKING' }
    });

    // 3. Total Messages
    const totalMessages = await ChatLog.count({ where: { userId } });

    res.json({
      overview: {
        totalContacts,
        activeDevices
      },
      summary: {
        totalContacts,
        activeDevices,
        totalMessages
      },
      messageStats: { sent: 0, delivered: 0, read: 0, failed: 0 } // Placeholder until we have granular message logging
    });

  } catch (error) {
    console.error('Analytics Overview Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get recent incoming messages for the devices page
 */
exports.getRecentMessages = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get recent user messages (incoming from customers)
    const messages = await ChatLog.findAll({
      where: { 
        userId, 
        role: 'user' 
      },
      order: [['createdAt', 'DESC']],
      limit: 30,
      raw: true
    });

    // Enrich with contact info
    const enrichedMessages = await Promise.all(messages.map(async (msg) => {
      const phoneNumber = msg.chatId.split('@')[0];
      const contact = await Contact.findOne({
        where: { userId, phoneNumber },
        attributes: ['id', 'name', 'phoneNumber']
      });

      return {
        id: msg.id,
        deviceId: msg.deviceId,
        message: msg.message.substring(0, 100) + (msg.message.length > 100 ? '...' : ''),
        contactName: contact?.name || phoneNumber,
        phoneNumber,
        createdAt: msg.createdAt
      };
    }));

    res.json({ messages: enrichedMessages });

  } catch (error) {
    console.error('Recent Messages Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
