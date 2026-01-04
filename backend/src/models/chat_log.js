'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ChatLog extends Model {
    static associate(models) {
      ChatLog.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }
  
  ChatLog.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    chatId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('user', 'assistant', 'system'),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  }, {
    sequelize,
    modelName: 'ChatLog',
    tableName: 'chat_logs',
    indexes: [
      {
        name: 'idx_chat_history',
        fields: ['chatId', 'createdAt']
      }
    ]
  });
  
  return ChatLog;
};
