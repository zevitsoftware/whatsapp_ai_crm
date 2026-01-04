'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Auto Replies
    await queryInterface.createTable('auto_replies', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      keyword: {
        type: Sequelize.STRING,
        allowNull: false
      },
      matchType: {
        type: Sequelize.ENUM('EXACT', 'CONTAINS', 'STARTS_WITH', 'REGEX'),
        defaultValue: 'CONTAINS'
      },
      responseText: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      mediaUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      priority: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
    
    // 2. Link Rotators
    await queryInterface.createTable('link_rotators', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      name: { type: Sequelize.STRING, allowNull: false },
      targetNumbers: { type: Sequelize.JSON, defaultValue: [] },
      defaultMessage: { type: Sequelize.STRING, defaultValue: 'Hello!' },
      rotationType: {
        type: Sequelize.ENUM('RANDOM', 'SEQUENTIAL'),
        defaultValue: 'SEQUENTIAL'
      },
      clickCount: { type: Sequelize.INTEGER, defaultValue: 0 },
      currentIndex: { type: Sequelize.INTEGER, defaultValue: 0 },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    // 3. Link Rotator Clicks
    await queryInterface.createTable('link_rotator_clicks', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      rotatorId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'link_rotators', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      redirectedTo: { type: Sequelize.STRING, allowNull: false },
      ipAddress: { type: Sequelize.STRING, allowNull: true },
      userAgent: { type: Sequelize.TEXT, allowNull: true },
      referer: { type: Sequelize.STRING, allowNull: true },
      clickedAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    // 4. AI Providers
    await queryInterface.createTable('ai_providers', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      name: { type: Sequelize.STRING, allowNull: false },
      apiKey: { type: Sequelize.STRING, allowNull: false },
      model: { type: Sequelize.STRING, allowNull: false },
      endpoint: { type: Sequelize.STRING, allowNull: true },
      dailyLimit: { type: Sequelize.INTEGER, defaultValue: 100 },
      monthlyLimit: { type: Sequelize.INTEGER, defaultValue: 1000 },
      dailyUsed: { type: Sequelize.INTEGER, defaultValue: 0 },
      monthlyUsed: { type: Sequelize.INTEGER, defaultValue: 0 },
      lastDailyReset: { type: Sequelize.DATEONLY, defaultValue: Sequelize.NOW },
      lastMonthlyReset: { type: Sequelize.DATEONLY, defaultValue: Sequelize.NOW },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
      priority: { type: Sequelize.INTEGER, defaultValue: 0 },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    // 5. Blacklist
    await queryInterface.createTable('blacklist', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      phoneNumber: { type: Sequelize.STRING, allowNull: false },
      reason: {
        type: Sequelize.ENUM('UNSUBSCRIBE', 'SPAM_REPORT', 'MANUAL', 'BOUNCE'),
        defaultValue: 'UNSUBSCRIBE'
      },
      sourceMessage: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
    
    // Add unique constraint for blacklist
    await queryInterface.addConstraint('blacklist', {
      fields: ['userId', 'phoneNumber'],
      type: 'unique',
      name: 'unique_blacklist_user_phone'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('blacklist');
    await queryInterface.dropTable('ai_providers');
    await queryInterface.dropTable('link_rotator_clicks');
    await queryInterface.dropTable('link_rotators');
    await queryInterface.dropTable('auto_replies');
  }
};
