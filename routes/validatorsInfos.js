const router = require('express').Router();
const ValidatorInfo = require('../models/ValidatorInfo');

router.get('/validatorinfo/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const result = await ValidatorInfo.find({ stashId: id }).lean();
    //If no validator found
    if (!(result.length > 0)) {
      res.json({ message: 'No Validator found!', noValidator: true });
      return;
    }
    const currentvalidator = result[0].currentValidator;
    // console.log('yo', currentvalidator);
    const totalValue = currentvalidator.exposure.total / 10 ** 12;
    const ownValue = currentvalidator.exposure.own / 10 ** 12;
    const tempObj = {
      currentvalidator: currentvalidator,
      nominators: currentvalidator.exposure.others,
      totalStaked: parseFloat(totalValue.toFixed(3)),
      stakedBySelf: parseFloat(ownValue.toFixed(3)),
      stakedByOther: parseFloat((totalValue - ownValue).toFixed(3)),
      backers: currentvalidator.exposure.others.length,
      stakingLedgerTotal: (
        currentvalidator.stakingLedger.total /
        10 ** 12
      ).toFixed(3),
      stakingLedgerOwn: (
        currentvalidator.stakingLedger.total /
        10 ** 12
      ).toFixed(3),
      // poolReward: parseFloat(result[0].poolReward),
      commission: result[0].commission
    };
    res.json(tempObj);
  } catch (err) {
    res.status(400).send({ error: 'Error', err: err });
  }
});

router.get('/validatorinfo', async (req, res) => {
  try {
    const result = await ValidatorInfo.find().lean();
    //If no validator found
    if (!(result.length > 0)) {
      res.json([]);
      return;
    }
    res.json(result);
  } catch (err) {
    res.status(400).send({ error: 'Error', err: err });
  }
});

module.exports = router;
