'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LinkRotatorClick extends Model {
    static associate(models) {
      LinkRotatorClick.belongsTo(models.LinkRotator, { foreignKey: 'rotatorId', as: 'rotator' });
    }
  }
  
  LinkRotatorClick.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    rotatorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'link_rotators',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    redirectedTo: {
      type: DataTypes.STRING,
      allowNull: false
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    referer: {
      type: DataTypes.STRING,
      allowNull: true
    },
    clickedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'LinkRotatorClick',
    tableName: 'link_rotator_clicks'
  });
  
  return LinkRotatorClick;
};
