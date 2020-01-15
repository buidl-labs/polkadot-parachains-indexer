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
    const totalValue = currentvalidator.stakers.total / 10 ** 12;
    const ownValue = currentvalidator.stakers.own / 10 ** 12;
    const tempObj = {
      currentvalidator: currentvalidator,
      nominators: currentvalidator.stakers.others,
      totalStaked: totalValue.toFixed(3),
      stakedBySelf: ownValue.toFixed(3),
      stakedByOther: (totalValue - ownValue).toFixed(3),
      backers: currentvalidator.stakers.others.length,
      stakingLedgerTotal: (
        currentvalidator.stakingLedger.total /
        10 ** 12
      ).toFixed(3),
      stakingLedgerOwn: (
        currentvalidator.stakingLedger.total /
        10 ** 12
      ).toFixed(3),
      poolReward: result[0].poolReward
    };
    res.json(tempObj);
  } catch (err) {
    res.status(400).send({ error: 'Error', err: err });
  }
});

module.exports = router;
