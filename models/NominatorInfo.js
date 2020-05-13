const mongoose = require('mongoose');

const Nominator = new mongoose.Schema(
  {
    nominatorId: {
      type: String,
      // required: true
    },
    validators: [
      {
        validator: {
          validator: {
            points: [Number],
            totalStake: Number,
            stashId: {
              type: String,
              // required: true
            },
            // stashIdTruncated: {
            //   type: String,
            //   required: true
            // },
            // poolReward: {
            //   type: mongoose.Schema.Types.Mixed,
            //   required: true,
            // },
            commission: {
              type: Number,
              // required: true
            },
            name: {
              type: String,
              // required: true
            }
          },
          electedInfo: {
            accountId: String,
            controllerId: String,
            nominators: [],
            rewardDestination: Number,
            exposure: {
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
          }
        },
        staked: Number
      }
    ],
    totalStaked: {
      type: Number,
      // required: true
    },
    highestStaked: {
      type: Number,
      // required: true
    },
    othersStaked: {
      type: Number,
      // required: true
    },
    // expectedDailyRoi: {
    //   type: Number,
    //   default: 0,
    // },
    backers: {
      type: Number,
      // required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('nominators', Nominator);
