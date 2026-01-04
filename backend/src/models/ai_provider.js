'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AiProvider extends Model {
    static associate(models) {
      // No direct associations usually, system config
    }
  }
  
  AiProvider.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    apiKey: {
      type: DataTypes.STRING,
      allowNull: false
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false
    },
    endpoint: {
      type: DataTypes.STRING,
      allowNull: true
    },
    dailyLimit: {
      type: DataTypes.INTEGER,
      defaultValue: 100
    },
    monthlyLimit: {
      type: DataTypes.INTEGER,
      defaultValue: 1000
    },
    dailyUsed: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    monthlyUsed: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lastDailyReset: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW
    },
    lastMonthlyReset: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'AiProvider',
    tableName: 'ai_providers'
  });
  
  return AiProvider;
};
