const aiService = require('../services/ai.service');

/**
 * Test AI Chat with Knowledge Base (RAG)
 */
exports.testChat = async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // 1. Get/Create Test Contact to simulate user state
    const { Contact } = require('../models');
    let contact = await Contact.findOne({
      where: { userId: req.user.id, phoneNumber: 'TEST-AGENT' }
    });

    if (!contact) {
      contact = await Contact.create({
        userId: req.user.id,
        phoneNumber: 'TEST-AGENT',
        name: 'Unknown',
        status: 'active',
        attributes: { location: 'Unknown', consecutiveUnknownCount: 0, ignoreUntil: null }
      });
    }

    // RESET STATE ON NEW CHAT (Empty History)
    if (!history || history.length === 0) {
       console.log('[AI Test] New Chat detected: Resetting Test Contact Identity -> Unknown');
       contact.name = 'Unknown';
       contact.attributes = { 
         ...contact.attributes, 
         location: 'Unknown',
         consecutiveUnknownCount: 0,
         ignoreUntil: null
       };
       contact.changed('attributes', true);
       await contact.save();
    }

    // 2. CHECK IGNORE STATUS (Mirroring ReplyWorker Logic)
    const attributes = contact.attributes || {};
    if (attributes.ignoreUntil) {
      const ignoreTime = new Date(attributes.ignoreUntil);
      if (new Date() < ignoreTime) {
        return res.json({
           question: message,
           answer: `[SYSTEM: IGNORED] (User is currently in cooling down period until ${ignoreTime.toLocaleTimeString()}). Message ignored.`,
           timestamp: new Date().toISOString()
        });
      } else {
        // Expired? Clear it
        attributes.ignoreUntil = null;
        attributes.consecutiveUnknownCount = 0;
        contact.attributes = attributes;
        contact.changed('attributes', true);
        await contact.save();
      }
    }

    // Generate response using RAG with conversation history
    let response = await aiService.generateResponse(
      req.user.id,
      contact, // Pass valid contact
      message,
      true, // Enable knowledge base
      history // Pass conversation history
    );

    if (!response) {
      return res.status(503).json({ 
        error: 'AI service unavailable',
        message: 'No AI providers available or quota exceeded'
      });
    }

    // 3. OFF-TOPIC / UNKNOWN HANDLING LOGIC (Mirroring ReplyWorker Logic)
    const isUnknownResponse = response.includes("belum tersedia di sistem kami");

    if (isUnknownResponse) {
       let count = attributes.consecutiveUnknownCount || 0;
       count++;
       
       if (count >= 2) {
          // Threshold reached
          response = "Mohon maaf Kak, karena antrian pertanyaan sedang sangat padat dan pertanyaan Kakak memerlukan pengecekan manual yang lebih detail, kami akan segera kembali menghubungi Kakak dalam beberapa jam ke depan. Mohon kesediaannya menunggu ya, Kak. 🙏 Terima kasih!";
          
          // Set ignore for 3 hours
          attributes.ignoreUntil = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
          attributes.consecutiveUnknownCount = 0;
          
          response += "\n\n[SYSTEM: You are now IGNORED for 3 hours due to repeated off-topic questions]";
       } else {
          attributes.consecutiveUnknownCount = count;
       }
       
       contact.attributes = attributes;
       contact.changed('attributes', true);
       await contact.save();

    } else {
       // Valid response? Reset count
       if (attributes.consecutiveUnknownCount > 0) {
         attributes.consecutiveUnknownCount = 0;
         contact.attributes = attributes;
         contact.changed('attributes', true);
         await contact.save();
       }
    }

    res.json({
      question: message,
      answer: response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI Test Chat Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
