const { Campaign, CampaignLog, Contact, User, Device, sequelize } = require('../models');
const { Op } = require('sequelize');

exports.getOverview = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Campaigns Stats
    const totalCampaigns = await Campaign.count({ where: { userId } });
    const activeCampaigns = await Campaign.count({ 
      where: { userId, status: 'PROCESSING' } 
    });

    // 2. Message Stats (from CampaignLog)
    const logStats = await CampaignLog.findAll({
      include: [{
        model: Campaign,
        as: 'campaign',
        attributes: [],
        where: { userId }
      }],
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('CampaignLog.id')), 'count']
      ],
      group: ['CampaignLog.status'],
      raw: true
    });
    
    // Calculate total messages handled (sum of all logs)
    const totalMessages = logStats.reduce((sum, item) => sum + parseInt(item.count || 0), 0);

    // 3. Contact Stats
    const totalContacts = await Contact.count({ where: { userId } });
    
    // 4. Device Stats (CONNECTED or WORKING)
    const activeDevices = await Device.count({ 
      where: { 
        userId, 
        status: { [Op.or]: ['CONNECTED', 'WORKING'] }
      } 
    });

    res.json({
      summary: {
        totalCampaigns,
        activeCampaigns,
        totalContacts,
        activeDevices,
        totalMessages
      },
      logs: logStats
    });

  } catch (error) {
    console.error('Analytics Overview Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
