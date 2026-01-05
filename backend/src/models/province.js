'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Province extends Model {
    static associate(models) {
      Province.hasMany(models.Regency, { foreignKey: 'province_id', as: 'regencies' });
    }
  }
  Province.init({
    id: { type: DataTypes.INTEGER, primaryKey: true },
    name: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Province',
    tableName: 'tbl_province',
    timestamps: false
  });
  return Province;
};
