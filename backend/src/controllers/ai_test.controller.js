const aiService = require('../services/ai.service');

/**
 * Test AI Chat with Knowledge Base (RAG)
 */
exports.testChat = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`[AI Test] User ${req.user.id} asked: "${message}"`);

    // Generate response using RAG
    const response = await aiService.generateResponse(
      req.user.id,
      message,
      true // Enable knowledge base
    );

    if (!response) {
      return res.status(503).json({ 
        error: 'AI service unavailable',
        message: 'No AI providers available or quota exceeded'
      });
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
