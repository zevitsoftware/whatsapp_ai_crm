'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Campaign extends Model {
    static associate(models) {
      Campaign.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      Campaign.hasMany(models.CampaignLog, { foreignKey: 'campaignId', as: 'logs' });
    }
  }
  
  Campaign.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    messageTemplate: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('broadcast', 'auto_reply', 'drip'),
      defaultValue: 'broadcast'
    },
    status: {
      type: DataTypes.ENUM('DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED'),
      defaultValue: 'DRAFT'
    },
    mediaUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    scheduledAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    totalContacts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    processedContacts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    successCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    failedCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'Campaign',
    tableName: 'campaigns'
  });
  
  return Campaign;
};
