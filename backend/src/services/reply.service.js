const { AutoReply, Device, AiProvider } = require('../models');
const { Op } = require('sequelize');
const spintaxService = require('./spintax.service');
const wahaService = require('./waha.service');
const aiService = require('./ai.service');

class ReplyService {
  /**
   * Main entry point for processing incoming messages
   */
  async processIncoming(session, payload) {
    const { from, body } = payload;
    const chatId = from;
    const incomingText = body || '';

    try {
      const device = await Device.findOne({ 
        where: { sessionName: session },
        include: ['user']
      });

      if (!device || !device.user) return;
      const userId = device.userId;

      // 1. Try Keyword Matching (Immediate)
      const matchedReply = await this.findKeywordMatch(userId, incomingText);

      if (matchedReply) {
        let responseText = matchedReply.responseText;
        const finalMessage = spintaxService.processMessage(responseText, {
          name: payload.pushName || 'User',
          phone: from.split('@')[0]
        });

        await wahaService.sendSeen(session, chatId);
        await wahaService.startTyping(session, chatId);
        await new Promise(resolve => setTimeout(resolve, 2000));
        await wahaService.stopTyping(session, chatId);
        await wahaService.sendText(session, { chatId, text: finalMessage });
        return;
      }

      // 2. Schedule AI Response with 3-7 min Delay
      const replyQueue = require('./reply.queue');
      const delayMs = Math.floor(Math.random() * (420000 - 180000 + 1)) + 180000;
      
      await replyQueue.add('delayed-reply', 
        { session, payload, delayMs },
        { delay: delayMs }
      );

      console.log(`[ReplyService] Scheduled AI reply for ${chatId} in ${Math.round(delayMs/1000/60)}m`);

    } catch (error) {
      console.error('[ReplyService] Error:', error);
    }
  }


  /**
   * Search for keyword matches in DB
   */
  async findKeywordMatch(userId, text) {
    const query = text.toLowerCase().trim();
    
    // Get all active replies for user ordered by priority
    const replies = await AutoReply.findAll({
      where: { userId, isActive: true },
      order: [['priority', 'DESC'], ['createdAt', 'ASC']]
    });

    for (const reply of replies) {
      const keyword = reply.keyword.toLowerCase();
      
      switch (reply.matchType) {
        case 'EXACT':
          if (query === keyword) return reply;
          break;
        case 'STARTS_WITH':
          if (query.startsWith(keyword)) return reply;
          break;
        case 'CONTAINS':
          if (query.includes(keyword)) return reply;
          break;
        case 'REGEX':
          try {
            const re = new RegExp(reply.keyword, 'i');
            if (re.test(text)) return reply;
          } catch (e) {
            console.error(`Invalid regex for reply ${reply.id}`);
          }
          break;
      }
    }

    return null;
  }
}

module.exports = new ReplyService();
