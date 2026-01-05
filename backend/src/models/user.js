'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // Define associations here
      User.hasMany(models.Device, { foreignKey: 'userId', as: 'devices' });
      User.hasMany(models.Contact, { foreignKey: 'userId', as: 'contacts' });
    }
  }
  
  User.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('admin', 'user'),
      defaultValue: 'user'
    },
    status: {
      type: DataTypes.ENUM('active', 'suspended', 'inactive'),
      defaultValue: 'active'
    },
    companyName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    subscriptionType: {
      type: DataTypes.ENUM('FREE', 'PRO', 'ENTERPRISE'),
      defaultValue: 'FREE'
    },
    subscriptionStatus: {
      type: DataTypes.ENUM('ACTIVE', 'EXPIRED', 'PENDING'),
      defaultValue: 'PENDING'
    },
    subscriptionExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    knowledgeSummary: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      }
    }
  });

  User.prototype.validatePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
  };

  return User;
};
