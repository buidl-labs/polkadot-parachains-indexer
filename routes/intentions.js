const router = require('express').Router();
const Intention = require('../models/Intention');

router.get('/intentions', async (req, res) => {
  try {
    const result = await Intention.find();
    res.json({ intentions: result[0].intentions, info: result[0].info });
  } catch (err) {
    res.status(400).send({ err: 'Error Bro', err: err });
  }
});

module.exports = router;
