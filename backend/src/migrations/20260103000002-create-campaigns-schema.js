'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create Campaigns Table
    await queryInterface.createTable('campaigns', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      messageTemplate: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('broadcast', 'auto_reply', 'drip'),
        defaultValue: 'broadcast'
      },
      status: {
        type: Sequelize.ENUM('DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED'),
        defaultValue: 'DRAFT'
      },
      mediaUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      scheduledAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      totalContacts: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      processedContacts: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      successCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      failedCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // 2. Create Campaign Logs Table
    await queryInterface.createTable('campaign_logs', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      campaignId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'campaigns',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      contactId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'contacts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'SENT', 'FAILED', 'DELIVERED', 'READ'),
        defaultValue: 'PENDING'
      },
      messageId: {
        type: Sequelize.STRING,
        allowNull: true
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      sentAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add indexes
    await queryInterface.addIndex('campaign_logs', ['campaignId', 'status']);
    await queryInterface.addIndex('campaign_logs', ['contactId']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('campaign_logs');
    await queryInterface.dropTable('campaigns');
  }
};
