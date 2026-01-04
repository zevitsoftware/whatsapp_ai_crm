'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SubscriptionPackage extends Model {
    static associate(models) {
      // Define associations here
      SubscriptionPackage.hasMany(models.Transaction, { foreignKey: 'packageId', as: 'transactions' });
    }
  }
  
  SubscriptionPackage.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('FREE', 'PRO', 'ENTERPRISE'),
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },
    durationDays: {
      type: DataTypes.INTEGER,
      defaultValue: 30
    },
    features: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'SubscriptionPackage',
    tableName: 'subscription_packages'
  });
  
  return SubscriptionPackage;
};
