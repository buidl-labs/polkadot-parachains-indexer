const mongoose = require('mongoose');

const Nominator = new mongoose.Schema(
  {
    nominatorId: {
      type: String,
      // required: true
    },
    validators: [
      {
        info: {
          accountId: String,
          controllerId: String,
          nominators: [],
          rewardDestination: String,
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
        },
        eraPoints: [
          {
            eraIndex: { 
              type: Number, 
              // required: true 
            },
            points: { type: Number, 
              // required: true 
            },
            total: {
              type: Number,
              // required: true
            }
          }
        ],
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
