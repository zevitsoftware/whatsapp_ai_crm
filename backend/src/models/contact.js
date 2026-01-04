'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Contact extends Model {
    static associate(models) {
      Contact.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }
  
  Contact.init({
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
    name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    tags: {
      type: DataTypes.JSON, // Array of strings
      defaultValue: []
    },
    attributes: {
      type: DataTypes.JSON, // Key-value pairs for custom fields
      defaultValue: {}
    },
    status: {
      type: DataTypes.ENUM('active', 'unsubscribed', 'bounced'),
      defaultValue: 'active'
    },
    isAiEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Contact',
    tableName: 'contacts',
    indexes: [
      {
        unique: true,
        fields: ['userId', 'phoneNumber']
      }
    ]
  });
  
  return Contact;
};
