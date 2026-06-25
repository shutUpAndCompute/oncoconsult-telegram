const express = require('express');
const router = express.Router();
const MasterDataManager = require('../services/masterDataManager');
const masterData = new MasterDataManager();

router.get('/', (req, res) => {
  res.json({
    specialties: masterData.getSpecialties(),
    cancerTypes: masterData.getCancerTypes(),
    fees: masterData.getDefaultFees(),
    discounts: masterData.getDefaultDiscounts()
  });
});

router.put('/specialties', (req, res) => {
  const { specialties } = req.body;
  if (!Array.isArray(specialties)) {
    return res.status(400).json({ error: 'specialties must be an array' });
  }
  masterData.updateSpecialties(specialties);
  res.json({ success: true, specialties: masterData.getSpecialties() });
});

router.put('/cancer-types', (req, res) => {
  const { cancerTypes } = req.body;
  if (!Array.isArray(cancerTypes)) {
    return res.status(400).json({ error: 'cancerTypes must be an array' });
  }
  masterData.updateCancerTypes(cancerTypes);
  res.json({ success: true, cancerTypes: masterData.getCancerTypes() });
});

router.put('/fees', (req, res) => {
  const { fees } = req.body;
  masterData.updateFees(fees);
  res.json({ success: true, fees: masterData.getDefaultFees() });
});

router.put('/discounts', (req, res) => {
  const { discounts } = req.body;
  masterData.updateDiscounts(discounts);
  res.json({ success: true, discounts: masterData.getDefaultDiscounts() });
});

module.exports = router;