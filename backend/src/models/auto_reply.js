'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AutoReply extends Model {
    static associate(models) {
      AutoReply.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }
  
  AutoReply.init({
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
    keyword: {
      type: DataTypes.STRING,
      allowNull: false
    },
    matchType: {
      type: DataTypes.ENUM('EXACT', 'CONTAINS', 'STARTS_WITH', 'REGEX'),
      defaultValue: 'CONTAINS'
    },
    responseText: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    mediaUrl: {
      type: DataTypes.STRING,
      allowNull: true
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
    modelName: 'AutoReply',
    tableName: 'auto_replies',
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['keyword']
      }
    ]
  });
  
  return AutoReply;
};
