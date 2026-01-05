const { AgentTemplate, AgentConfig } = require('../models');

/**
 * Get all available agent templates
 */
exports.getTemplates = async (req, res) => {
  try {
    const templates = await AgentTemplate.findAll({
      order: [['createdAt', 'ASC']]
    });
    res.json(templates);
  } catch (error) {
    console.error('[AgentController] Error fetching templates:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get current user's agent config
 */
exports.getConfig = async (req, res) => {
  try {
    const userId = req.user.id;
    let config = await AgentConfig.findOne({
      where: { userId },
      include: [{ model: AgentTemplate, as: 'template' }]
    });

    // If no config exists, return null or a default empty state
    res.json(config);
  } catch (error) {
    console.error('[AgentController] Error fetching config:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update or create user's agent config
 */
exports.updateConfig = async (req, res) => {
  try {
    const userId = req.user.id;
    const { templateId, customPrompt, isActive } = req.body;

    if (!customPrompt) {
      return res.status(400).json({ message: 'Prompt content is required' });
    }

    let config = await AgentConfig.findOne({ where: { userId } });

    if (config) {
      await config.update({
        templateId,
        customPrompt,
        isActive: isActive !== undefined ? isActive : config.isActive
      });
    } else {
      config = await AgentConfig.create({
        userId,
        templateId,
        customPrompt,
        isActive: isActive !== undefined ? isActive : true
      });
    }

    res.json({
      message: 'Agent configuration saved successfully',
      config
    });
  } catch (error) {
    console.error('[AgentController] Error updating config:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
