'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Blacklist extends Model {
    static associate(models) {
      Blacklist.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }
  
  Blacklist.init({
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
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false
    },
    reason: {
      type: DataTypes.ENUM('UNSUBSCRIBE', 'SPAM_REPORT', 'MANUAL', 'BOUNCE'),
      defaultValue: 'UNSUBSCRIBE'
    },
    sourceMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Blacklist',
    tableName: 'blacklist',
    indexes: [
      {
        unique: true,
        fields: ['userId', 'phoneNumber']
      }
    ]
  });
  
  return Blacklist;
};
