const router = require('express').Router();
const RiskScore = require('../models/RiskScore');

router.get('/riskscore', async (req, res) => {
  try {
    const result = await RiskScore.find();
    res.json({ riskscore: result[0].riskscore, info: result[0].info });
  } catch (err) {
    res.status(400).send({ err: 'Error Bro', err: err });
  }
});

module.exports = router;
