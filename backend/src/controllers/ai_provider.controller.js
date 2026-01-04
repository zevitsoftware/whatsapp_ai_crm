const { AiProvider } = require('../models');

exports.create = async (req, res) => {
  try {
    const { name, apiKey, model, endpoint, dailyLimit, monthlyLimit, priority } = req.body;
    
    if (!name || !apiKey || !model) {
      return res.status(400).json({ error: 'Name, apiKey, and model are required' });
    }

    const provider = await AiProvider.create({
      name,
      apiKey,
      model,
      endpoint,
      dailyLimit: dailyLimit || 100,
      monthlyLimit: monthlyLimit || 1000,
      priority: priority || 0
    });

    res.status(201).json(provider);
  } catch (error) {
    console.error('Create AiProvider Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.list = async (req, res) => {
  try {
    // Note: AI Providers are system-wide or user-specific? 
    // Implementation plan suggests system config, but models have no userId.
    // For now, listing all active ones.
    const providers = await AiProvider.findAll({
      order: [['priority', 'DESC']]
    });
    res.json(providers);
  } catch (error) {
    console.error('List AiProvider Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, apiKey, model, endpoint, dailyLimit, monthlyLimit, priority, isActive } = req.body;

    const provider = await AiProvider.findByPk(id);
    if (!provider) return res.status(404).json({ error: 'Provider not found' });

    await provider.update({
      name,
      apiKey,
      model,
      endpoint,
      dailyLimit,
      monthlyLimit,
      priority,
      isActive
    });

    res.json(provider);
  } catch (error) {
    console.error('Update AiProvider Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await AiProvider.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ error: 'Provider not found' });
    res.json({ message: 'Provider deleted successfully' });
  } catch (error) {
    console.error('Delete AiProvider Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
