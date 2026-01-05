'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AgentTemplate extends Model {
    static associate(models) {
      AgentTemplate.hasMany(models.AgentConfig, { foreignKey: 'templateId', as: 'configs' });
    }
  }
  
  AgentTemplate.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true
    },
    category: {
      type: DataTypes.STRING,
      defaultValue: 'General'
    }
  }, {
    sequelize,
    modelName: 'AgentTemplate',
    tableName: 'agent_templates'
  });
  
  return AgentTemplate;
};
