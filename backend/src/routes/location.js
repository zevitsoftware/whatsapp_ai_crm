const express = require('express');
const router = express.Router();
const locationController = require('../controllers/location.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/provinces', locationController.getProvinces);
router.get('/regencies/:id', locationController.getRegencyById);
router.get('/regencies', locationController.getRegencies);
router.get('/districts/:id', locationController.getDistrictById);
router.get('/districts', locationController.getDistricts);

module.exports = router;
