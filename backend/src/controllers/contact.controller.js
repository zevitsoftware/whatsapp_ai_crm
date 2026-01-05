const { Contact } = require('../models');
// List Contacts
exports.list = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, tags, provinceId, regencyId, districtId } = req.query;
    const offset = (page - 1) * limit;

    const where = { userId: req.user.id };

    // Search filter
    if (search && search.trim()) {
      const { Op } = require('sequelize');
      const searchTerm = search.trim();
      where[Op.or] = [
        { name: { [Op.like]: `%${searchTerm}%` } },
        { phoneNumber: { [Op.like]: `%${searchTerm}%` } }
      ];
    }

    // Tags filter (JSON contains)
    if (tags) {
      const { Op } = require('sequelize');
      const tagArray = tags.split(',');
      where.tags = { [Op.overlap]: tagArray };
    }

    // Location filters (JSON path queries)
    const { Op, Sequelize } = require('sequelize');
    if (provinceId) {
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push(
        Sequelize.where(
          Sequelize.literal(`JSON_EXTRACT(attributes, '$.locationData.provinceId')`),
          provinceId
        )
      );
    }
    if (regencyId) {
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push(
        Sequelize.where(
          Sequelize.literal(`JSON_EXTRACT(attributes, '$.locationData.regencyId')`),
          regencyId
        )
      );
    }
    if (districtId) {
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push(
        Sequelize.where(
          Sequelize.literal(`JSON_EXTRACT(attributes, '$.locationData.districtId')`),
          districtId
        )
      );
    }

    const { count, rows } = await Contact.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      contacts: rows
    });

  } catch (error) {
    console.error('List Contacts Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Import Contacts from CSV
exports.importCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const csvData = req.file.buffer.toString('utf-8');
    const Papa = require('papaparse');
    const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });

    const contacts = [];
    for (const row of parsed.data) {
      const phoneNumber = row.phone || row.phoneNumber || row.number;
      const name = row.name || `Contact ${phoneNumber}`;

      if (phoneNumber) {
        contacts.push({
          userId: req.user.id,
          phoneNumber,
          name,
          tags: row.tags ? row.tags.split(',').map(t => t.trim()) : [],
          status: 'active'
        });
      }
    }

    await Contact.bulkCreate(contacts, { ignoreDuplicates: true });
    res.json({ message: `${contacts.length} contacts imported successfully` });

  } catch (error) {
    console.error('Import CSV Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create Contact
exports.create = async (req, res) => {
  try {
    const { phoneNumber, name, email, tags } = req.body;

    const contact = await Contact.create({
      userId: req.user.id,
      phoneNumber,
      name,
      email,
      tags: tags || [],
      status: 'active'
    });

    res.status(201).json({ message: 'Contact created successfully', contact });

  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Contact already exists' });
    }
    console.error('Create Contact Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete Contact
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await Contact.findOne({
      where: { id, userId: req.user.id }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    await contact.destroy();
    res.json({ message: 'Contact deleted successfully' });

  } catch (error) {
    console.error('Delete Contact Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Bulk Delete Contacts
exports.bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No contact IDs provided' });
    }

    await Contact.destroy({
      where: {
        id: ids,
        userId: req.user.id
      }
    });

    res.json({ message: `${ids.length} contacts deleted successfully` });

  } catch (error) {
    console.error('Bulk Delete Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update Contact
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, status, isActive, tags, location } = req.body;

    const contact = await Contact.findOne({
      where: { id, userId: req.user.id }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    if (name !== undefined) contact.name = name;
    if (status !== undefined) contact.status = status;
    if (isActive !== undefined) contact.isActive = isActive;
    if (tags !== undefined) contact.tags = tags;
    
    // Handle location update
    if (location !== undefined) {
      const attributes = { ...(contact.attributes || {}) };
      
      if (location && typeof location === 'object') {
        // If it's a rich location object from dropdowns
        attributes.location = location.name;
        attributes.locationData = location;
      } else {
        // Simple string update
        attributes.location = location;
      }
      
      contact.attributes = attributes;
      contact.changed('attributes', true);
    }

    await contact.save();
    res.json({ message: 'Contact updated successfully', contact });

  } catch (error) {
    console.error('Update Contact Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get Chat History
exports.getChatHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { ChatLog } = require('../models');

    const contact = await Contact.findOne({
      where: { id, userId: req.user.id }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const { Op } = require('sequelize');
    const messages = await ChatLog.findAll({
      where: { 
        chatId: { [Op.like]: `${contact.phoneNumber}%` },
        userId: req.user.id 
      },
      order: [['createdAt', 'ASC']],
      limit: 100
    });

    res.json({ messages });

  } catch (error) {
    console.error('Get Chat History Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
