const { AutoReply } = require('../models');

exports.create = async (req, res) => {
  try {
    const { keyword, matchType, responseText, mediaUrl, priority } = req.body;
    
    if (!keyword || !responseText) {
      return res.status(400).json({ error: 'Keyword and response text are required' });
    }

    const reply = await AutoReply.create({
      userId: req.user.id,
      keyword,
      matchType: matchType || 'CONTAINS',
      responseText,
      mediaUrl,
      priority: priority || 0
    });

    res.status(201).json(reply);
  } catch (error) {
    console.error('Create AutoReply Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.list = async (req, res) => {
  try {
    const replies = await AutoReply.findAll({
      where: { userId: req.user.id },
      order: [['priority', 'DESC'], ['createdAt', 'DESC']]
    });
    res.json(replies);
  } catch (error) {
    console.error('List AutoReply Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { keyword, matchType, responseText, mediaUrl, priority, isActive } = req.body;

    const reply = await AutoReply.findOne({ where: { id, userId: req.user.id } });
    if (!reply) return res.status(404).json({ error: 'Auto-reply not found' });

    await reply.update({
      keyword,
      matchType,
      responseText,
      mediaUrl,
      priority,
      isActive
    });

    res.json(reply);
  } catch (error) {
    console.error('Update AutoReply Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await AutoReply.destroy({ where: { id, userId: req.user.id } });
    if (!deleted) return res.status(404).json({ error: 'Auto-reply not found' });
    res.json({ message: 'Auto-reply deleted successfully' });
  } catch (error) {
    console.error('Delete AutoReply Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
