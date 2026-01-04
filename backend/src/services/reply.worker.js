const { Worker } = require('bullmq');
const { ChatLog, Device, Contact } = require('../models');
const aiService = require('./ai.service');
const wahaService = require('./waha.service');
const spintaxService = require('./spintax.service');

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined
};

let worker;

const processReply = async (job) => {
  const { session, payload, delayMs } = job.data;
  const { from, body, pushName } = payload;
  const chatId = from;
  const incomingText = body || '';

  console.log(`[ReplyWorker] Processing delayed message for ${chatId} (waited ${Math.round(delayMs/1000/60)}m)`);

  try {
    // 1. Get Device & User
    const device = await Device.findOne({ 
      where: { sessionName: session },
      include: ['user']
    });

    if (!device) return;
    const userId = device.userId;

    // 2. Check/Create Contact & AI Policy
    const [contact] = await Contact.findOrCreate({
      where: { userId, phoneNumber: from.split('@')[0] },
      defaults: { status: 'active', isAiEnabled: true }
    });

    if (!contact.isAiEnabled) {
      console.log(`[ReplyWorker] AI is disabled for contact ${chatId}. CS may have taken over.`);
      return;
    }

    // 3. Save Incoming Message to History
    await ChatLog.create({
      userId,
      chatId,
      role: 'user',
      message: incomingText
    });

    // 4. Fetch History (Last 10 messages)
    const history = await ChatLog.findAll({
      where: { chatId },
      order: [['createdAt', 'DESC']],
      limit: 10
    });
    
    // Reverse to get chronological order for AI
    const conversationHistory = history.reverse().map(h => ({
      role: h.role,
      content: h.message
    }));

    // 5. Check "Flood" Logic (every 10th response)
    const assistantReplyCount = await ChatLog.count({
      where: { chatId, role: 'assistant' }
    });
    
    let isFloodWarningNeeded = (assistantReplyCount > 0 && (assistantReplyCount + 1) % 10 === 0);

    // 6. Generate AI Response with Context
    let responseText = await aiService.generateResponse(userId, incomingText, true, conversationHistory);
    
    if (!responseText) return;

    // Append flood apology if it's the 10th message
    if (isFloodWarningNeeded) {
      responseText += "\n\n(Mohon maaf jika respon kami sedikit melambat dikarenakan antrian chat yang sedang padat. Kami akan segera membantu Kakak sebaik mungkin!)";
    }

    // 7. Save Assistant Message to History
    await ChatLog.create({
      userId,
      chatId,
      role: 'assistant',
      message: responseText
    });

    // 8. Send to WhatsApp
    const finalMessage = spintaxService.processMessage(responseText, {
      name: pushName || 'User',
      phone: from.split('@')[0]
    });

    await wahaService.sendSeen(session, chatId);
    await wahaService.startTyping(session, chatId);
    
    const typingTime = Math.max(2000, Math.min(5000, finalMessage.length * 20));
    await new Promise(resolve => setTimeout(resolve, typingTime));
    
    await wahaService.stopTyping(session, chatId);
    await wahaService.sendText(session, { chatId, text: finalMessage });

    console.log(`[ReplyWorker] Replied to ${chatId} with context.`);

  } catch (error) {
    console.error('[ReplyWorker] Error:', error);
  }
};

module.exports = {
  start: () => {
    worker = new Worker('reply-queue', processReply, { 
      connection,
      autorun: true 
    });
    console.log('[ReplyWorker] Worker started and listening...');
  },
  stop: async () => {
    if (worker) {
      await worker.close();
      console.log('[ReplyWorker] Worker stopped.');
    }
  }
};
