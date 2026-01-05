'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AiModelSpec extends Model {
    static associate(models) {
      // Potentially can associate with AiProvider if needed, 
      // but usually we just look up by string match on 'model'
    }
  }
  
  AiModelSpec.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    provider: {
      type: DataTypes.STRING,
      allowNull: false
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    maxContext: {
      type: DataTypes.INTEGER,
      defaultValue: 8192
    },
    maxOutput: {
      type: DataTypes.INTEGER,
      defaultValue: 2000
    },
    rpm: DataTypes.INTEGER, // Requests Per Minute
    rpd: DataTypes.INTEGER, // Requests Per Day
    tpm: DataTypes.INTEGER, // Tokens Per Minute
    tpd: DataTypes.INTEGER  // Tokens Per Day
  }, {
    sequelize,
    modelName: 'AiModelSpec',
    tableName: 'ai_model_specs'
  });
  
  return AiModelSpec;
};
