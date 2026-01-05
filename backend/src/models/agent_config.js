'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AgentConfig extends Model {
    static associate(models) {
      AgentConfig.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      AgentConfig.belongsTo(models.AgentTemplate, { foreignKey: 'templateId', as: 'template' });
    }
  }
  
  AgentConfig.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    templateId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    customPrompt: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'AgentConfig',
    tableName: 'agent_configs'
  });
  
  return AgentConfig;
};
