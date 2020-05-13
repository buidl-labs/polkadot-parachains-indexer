const mongoose = require('mongoose');

const Intention = new mongoose.Schema(
  {
    intentions: [String],
    validatorsAndIntentions: [String],
    info: [
      {
        accountId: {
          type: String,
          // required: true,
          maxlength: 255
        },
        controllerId: {
          type: String,
          // required: true,
          maxlength: 255
        },
        nominators: [],
        rewardDestination: {
          type: String
        },
        exposure: {
          total: {
            type: Number,
            default: 0
          },
          own: {
            type: Number,
            default: 0
          },
          others: {
            type: Array,
            default: []
          }
        },
        stakingLedger: {
          stash: {
            type: String,
            // required: true,
            maxlength: 255
          },
          total: {
            type: Number,
            default: 0
          },
          active: {
            type: Number,
            default: 0
          },
          unlocking: []
        },
        stashId: {
          type: String,
          // required: true,
          maxlength: 255
        },
        validatorPrefs: {
          commission: 0
        },
        nextSessionIds: [],
        sessionIds: [],
        redeemable: {
          type: Number,
          default: 0
        }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('intentions', Intention);
