const mongoose = require("mongoose");

const Validator = new mongoose.Schema(
	{
		stashId: {
			type: String,
			maxlength: 255
		},
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
		// stashIdTruncated: {
		//   type: String,
		//   maxlength: 100,
		//   required: true
		// },
		// "eraPoints":[{"eraIndex":782,"points":400,"total":71760},{"eraIndex":783,"points":220,"total":71740},{"eraIndex":784,"points":340,"total":71660}]
		eraPoints: [
			{
				eraIndex: { type: Number},
				points: { type: Number },
				total: {
					type: Number
				}
			}
		],
		// poolReward: {
		//   type: mongoose.Schema.Types.Mixed,
		//   required: true
		// },
		totalStake: {
			type: Number,
			default: 0
		},
		commission: {
			type: Number,
		},
		name: {
			type: String,
			maxlength: 255
		},
		noOfNominators: {
			type: Number
		}
		// poolRewardWithCommission: {
		//   type: mongoose.Schema.Types.Mixed,
		//   required: true
		// },
		// accountIndex: {
		//   type: String,
		//   required: true
		// }
	},
	{ timestamps: true }
);

module.exports = mongoose.model("validators", Validator);
