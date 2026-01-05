const { Province, Regency, District } = require('../models');

exports.getProvinces = async (req, res) => {
  try {
    const provinces = await Province.findAll({
      order: [['name', 'ASC']]
    });
    res.json(provinces);
  } catch (error) {
    console.error('getProvinces error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getRegencies = async (req, res) => {
  try {
    const { provinceId } = req.query;
    const where = {};
    if (provinceId) where.province_id = provinceId;

    const regencies = await Regency.findAll({
      where,
      order: [['name', 'ASC']]
    });
    res.json(regencies);
  } catch (error) {
    console.error('getRegencies error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getRegencyById = async (req, res) => {
  try {
    const { id } = req.params;
    const regency = await Regency.findByPk(id);
    if (!regency) return res.status(404).json({ error: 'Regency not found' });
    res.json(regency);
  } catch (error) {
    console.error('getRegencyById error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getDistricts = async (req, res) => {
  try {
    const { regencyId } = req.query;
    const where = {};
    if (regencyId) where.regency_id = regencyId;

    const districts = await District.findAll({
      where,
      order: [['name', 'ASC']]
    });
    res.json(districts);
  } catch (error) {
    console.error('getDistricts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getDistrictById = async (req, res) => {
  try {
    const { id } = req.params;
    const district = await District.findByPk(id, { include: ['regency'] });
    if (!district) return res.status(404).json({ error: 'District not found' });
    res.json(district);
  } catch (error) {
    console.error('getDistrictById error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
