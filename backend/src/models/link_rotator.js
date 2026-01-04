'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LinkRotator extends Model {
    static associate(models) {
      LinkRotator.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      LinkRotator.hasMany(models.LinkRotatorClick, { foreignKey: 'rotatorId', as: 'clicks' });
    }
  }
  
  LinkRotator.init({
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
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true // Slugs should be unique system-wide to handle redirects easily
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    targetNumbers: {
      type: DataTypes.JSON, // Array of strings (phone numbers)
      defaultValue: []
    },
    defaultMessage: {
      type: DataTypes.STRING,
      defaultValue: 'Hello!'
    },
    rotationType: {
      type: DataTypes.ENUM('RANDOM', 'SEQUENTIAL'),
      defaultValue: 'SEQUENTIAL'
    },
    clickCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    currentIndex: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'LinkRotator',
    tableName: 'link_rotators',
    indexes: [
      {
        unique: true,
        fields: ['slug']
      }
    ]
  });
  
  return LinkRotator;
};
