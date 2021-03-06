const mongoose = require('mongoose');

const ValidatorInfo = new mongoose.Schema(
  {
    currentValidator: {
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
    stashId: {
      type: String,
      required: true
    },
    stashIdTruncated: {
      type: String,
      maxlength: 100,
      required: true
    },
    points: {
      type: [Number],
      required: true
    },
    poolReward: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    totalStake: {
      type: Number,
      default: 0
    },
    commission: {
      type: Number,
      required: true
    },
    name: {
      type: String,
      required: true,
      maxlength: 255
    },
    noOfNominators: {
      type: Number,
      required: true
    },
    poolRewardWithCommission: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    accountIndex: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('validatorinfos', ValidatorInfo);
