const { Contact } = require('../models');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

// List Contacts
exports.list = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, tags } = req.query;
    const offset = (page - 1) * limit;

    const where = { userId: req.user.id };

    // Search filter
    if (search) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { phoneNumber: { [Op.like]: `%${search}%` } }
      ];
    }

    // Tags filter (JSON contains)
    if (tags) {
      const { Op } = require('sequelize');
      const tagArray = tags.split(',');
      where.tags = { [Op.overlap]: tagArray };
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

    const filePath = req.file.path;
    const contacts = [];
    const errors = [];

    // Parse CSV
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Expected columns: name, phoneNumber, tags (comma-separated), source
        const { name, phoneNumber, tags, source } = row;

        // Validate phone number (basic check)
        if (!phoneNumber || phoneNumber.trim().length < 10) {
          errors.push({ row, error: 'Invalid phone number' });
          return;
        }

        // Clean phone number (remove spaces, dashes)
        const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');

        contacts.push({
          userId: req.user.id,
          name: name || 'Unknown',
          phoneNumber: cleanPhone,
          tags: tags ? tags.split(',').map(t => t.trim()) : [],
          source: source || 'csv_import',
          isActive: true
        });
      })
      .on('end', async () => {
        try {
          // Bulk insert with ignoreDuplicates
          const result = await Contact.bulkCreate(contacts, {
            ignoreDuplicates: true,
            validate: true
          });

          // Clean up uploaded file
          fs.unlinkSync(filePath);

          res.json({
            message: 'Import completed',
            total: contacts.length,
            created: result.length,
            duplicates: contacts.length - result.length,
            errors: errors.length
          });

        } catch (dbError) {
          console.error('Bulk Insert Error:', dbError);
          fs.unlinkSync(filePath);
          res.status(500).json({ error: 'Database error during import' });
        }
      })
      .on('error', (error) => {
        console.error('CSV Parse Error:', error);
        fs.unlinkSync(filePath);
        res.status(500).json({ error: 'Failed to parse CSV file' });
      });

  } catch (error) {
    console.error('Import CSV Error:', error);
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
