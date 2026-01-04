const { LinkRotator, LinkRotatorClick } = require('../models');

exports.create = async (req, res) => {
  try {
    const { name, slug, targetNumbers, defaultMessage, rotationType } = req.body;
    
    if (!name || !slug || !targetNumbers) {
      return res.status(400).json({ error: 'Name, slug, and target numbers are required' });
    }

    // Check if slug is taken
    const existing = await LinkRotator.findOne({ where: { slug } });
    if (existing) return res.status(400).json({ error: 'Slug is already in use' });

    const rotator = await LinkRotator.create({
      userId: req.user.id,
      name,
      slug,
      targetNumbers,
      defaultMessage,
      rotationType: rotationType || 'SEQUENTIAL'
    });

    res.status(201).json(rotator);
  } catch (error) {
    console.error('Create LinkRotator Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.list = async (req, res) => {
  try {
    const rotators = await LinkRotator.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.json(rotators);
  } catch (error) {
    console.error('List LinkRotator Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, targetNumbers, defaultMessage, rotationType, isActive } = req.body;

    const rotator = await LinkRotator.findOne({ where: { id, userId: req.user.id } });
    if (!rotator) return res.status(404).json({ error: 'Link Rotator not found' });

    await rotator.update({
      name,
      targetNumbers,
      defaultMessage,
      rotationType,
      isActive
    });

    res.json(rotator);
  } catch (error) {
    console.error('Update LinkRotator Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await LinkRotator.destroy({ where: { id, userId: req.user.id } });
    if (!deleted) return res.status(404).json({ error: 'Link Rotator not found' });
    res.json({ message: 'Link Rotator deleted successfully' });
  } catch (error) {
    console.error('Delete LinkRotator Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Public Redirect Logic
 */
exports.redirect = async (req, res) => {
  try {
    const { slug } = req.params;
    const rotator = await LinkRotator.findOne({ where: { slug, isActive: true } });

    if (!rotator || !rotator.targetNumbers || rotator.targetNumbers.length === 0) {
      return res.status(404).send('Link not found or inactive');
    }

    let targetIndex = 0;
    const count = rotator.targetNumbers.length;

    if (rotator.rotationType === 'RANDOM') {
      targetIndex = Math.floor(Math.random() * count);
    } else {
      // SEQUENTIAL
      targetIndex = rotator.currentIndex % count;
      rotator.currentIndex = (targetIndex + 1) % count;
    }

    const targetNumber = rotator.targetNumbers[targetIndex];
    rotator.clickCount += 1;
    await rotator.save();

    // Log the click
    await LinkRotatorClick.create({
      rotatorId: rotator.id,
      targetNumber,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    const waUrl = `https://wa.me/${targetNumber}?text=${encodeURIComponent(rotator.defaultMessage)}`;
    res.redirect(waUrl);

  } catch (error) {
    console.error('Redirect Error:', error);
    res.status(500).send('Internal server error');
  }
};
