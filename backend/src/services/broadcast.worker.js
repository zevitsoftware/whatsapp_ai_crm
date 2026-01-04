const { Worker } = require('bullmq');
const { Campaign, CampaignLog, Contact, Device } = require('../models');
const wahaService = require('./waha.service');
const spintaxService = require('./spintax.service');

class BroadcastWorker {
  constructor() {
    this.worker = null;
    this.deviceIndex = new Map(); // campaignId -> current device index
  }

  start() {
    this.worker = new Worker('broadcast', async (job) => {
      return await this.processMessage(job);
    }, {
      connection: {
        host: process.env.REDIS_HOST || 'redis',
        port: process.env.REDIS_PORT || 6379
      },
      concurrency: 5 // Process 5 messages concurrently
    });

    this.worker.on('completed', (job) => {
      console.log(`✅ Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`❌ Job ${job.id} failed:`, err.message);
    });

    console.log('📡 Broadcast Worker started');
  }

  async processMessage(job) {
    const { campaignId, logId, contactId, userId } = job.data;

    try {
      // Get campaign and contact
      const campaign = await Campaign.findByPk(campaignId);
      const contact = await Contact.findByPk(contactId);
      const log = await CampaignLog.findByPk(logId);

      if (!campaign || !contact || !log) {
        throw new Error('Campaign, contact, or log not found');
      }

      // Check if campaign is still active
      if (campaign.status === 'PAUSED' || campaign.status === 'CANCELLED') {
        log.status = 'FAILED';
        log.errorMessage = 'Campaign was paused or cancelled';
        await log.save();
        return;
      }

      // Get next available device (round-robin)
      const device = await this.getNextDevice(userId, campaignId);
      if (!device) {
        throw new Error('No active devices available');
      }

      // Process message with spintax
      const message = spintaxService.processMessage(campaign.messageTemplate, {
        name: contact.name,
        phone: contact.phoneNumber
      });

      // Update log
      log.status = 'SENDING';
      log.deviceId = device.id;
      log.messageSent = message;
      await log.save();

      const chatId = `${contact.phoneNumber}@c.us`;

      // Anti-blocking flow: Seen -> Typing -> Wait -> Stop Typing -> Send
      await wahaService.sendSeen(device.sessionName, chatId);
      await wahaService.startTyping(device.sessionName, chatId);
      
      // Artificial typing delay: ~50ms per character, min 1.5s, max 4s
      const typingTime = Math.max(1500, Math.min(4000, message.length * 50));
      await new Promise(resolve => setTimeout(resolve, typingTime));
      
      await wahaService.stopTyping(device.sessionName, chatId);

      // Send via WAHA
      const result = await wahaService.sendText(device.sessionName, {
        chatId: chatId,
        text: message
      });

      // Update log
      log.status = 'SENT';
      log.wahaMessageId = result.id;
      log.sentAt = new Date();
      await log.save();

      // Update campaign counters
      campaign.sentCount = (campaign.sentCount || 0) + 1;
      await campaign.save();

      return { success: true, messageId: result.id };

    } catch (error) {
      console.error('Broadcast Error:', error);

      // Update log
      const log = await CampaignLog.findByPk(logId);
      if (log) {
        log.status = 'FAILED';
        log.errorMessage = error.message;
        await log.save();
      }

      // Update campaign
      const campaign = await Campaign.findByPk(campaignId);
      if (campaign) {
        campaign.failedCount = (campaign.failedCount || 0) + 1;
        await campaign.save();
      }

      throw error;
    }
  }

  async getNextDevice(userId, campaignId) {
    // Get all working devices for this user
    const devices = await Device.findAll({
      where: { userId, status: 'WORKING' },
      order: [['id', 'ASC']]
    });

    if (devices.length === 0) return null;

    // Round-robin selection
    let index = this.deviceIndex.get(campaignId) || 0;
    const device = devices[index % devices.length];
    
    // Update index for next message
    this.deviceIndex.set(campaignId, index + 1);

    return device;
  }

  async stop() {
    if (this.worker) {
      await this.worker.close();
      console.log('📡 Broadcast Worker stopped');
    }
  }
}

module.exports = new BroadcastWorker();
