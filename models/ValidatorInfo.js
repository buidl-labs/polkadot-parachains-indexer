const mongoose = require('mongoose');

const ValidatorInfo = new mongoose.Schema(
  {
    accountId: String,
    controllerId: String,
    nominators: [],
    rewardDestination: Number,
    stakers: {
      total: String,
      own: Number,
      others: [
        {
          who: String,
          value: Number
        }
      ]
    },
    stakingLedger: {
      stash: String,
      total: Number,
      active: Number,
      unlocking: []
    },
    stashId: String,
    validatorPrefs: {
      commission: Number
    },
    nextSessionIds: [String],
    sessionIds: [String]
  },
  { timestamps: true }
);

module.exports = mongoose.model('validatorinfos', ValidatorInfo);
