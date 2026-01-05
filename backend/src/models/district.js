'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class District extends Model {
    static associate(models) {
      District.belongsTo(models.Regency, { foreignKey: 'regency_id', as: 'regency' });
    }
  }
  District.init({
    id: { type: DataTypes.INTEGER, primaryKey: true },
    regency_id: DataTypes.INTEGER,
    name: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'District',
    tableName: 'tbl_district',
    timestamps: false
  });
  return District;
};
