'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CampaignLog extends Model {
    static associate(models) {
      CampaignLog.belongsTo(models.Campaign, { foreignKey: 'campaignId', as: 'campaign' });
      CampaignLog.belongsTo(models.Contact, { foreignKey: 'contactId', as: 'contact' });
    }
  }
  
  CampaignLog.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    campaignId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'campaigns',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    contactId: {
      type: DataTypes.UUID,
      allowNull: true, // Can be null if contact was deleted but log kept, or ad-hoc
      references: {
        model: 'contacts',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'SENT', 'FAILED', 'DELIVERED', 'READ'),
      defaultValue: 'PENDING'
    },
    messageId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'CampaignLog',
    tableName: 'campaign_logs',
    indexes: [
      {
        fields: ['campaignId', 'status']
      },
      {
        fields: ['contactId']
      }
    ]
  });
  
  return CampaignLog;
};
