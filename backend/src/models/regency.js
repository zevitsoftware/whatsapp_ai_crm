'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Regency extends Model {
    static associate(models) {
      Regency.belongsTo(models.Province, { foreignKey: 'province_id', as: 'province' });
      Regency.hasMany(models.District, { foreignKey: 'regency_id', as: 'districts' });
    }
  }
  Regency.init({
    id: { type: DataTypes.INTEGER, primaryKey: true },
    province_id: DataTypes.INTEGER,
    name: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Regency',
    tableName: 'tbl_regency',
    timestamps: false
  });
  return Regency;
};
