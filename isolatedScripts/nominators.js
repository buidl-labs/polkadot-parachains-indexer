const { ApiPromise, WsProvider } = require("@polkadot/api");
const { hexToString } = require("@polkadot/util");
const nominators = async (validatorsInfoData) => {
	// Initialise the provider to connect to the local node
	const provider = new WsProvider("wss://kusama-rpc.polkadot.io");

	// Create the API and wait until ready

	const api = await ApiPromise.create({ provider });

	//Store all the unique nominators
	const nominators = [];
	Object.keys(validatorsInfoData).forEach(data => {
		validatorsInfoData[data].currentValidator.exposure.others.forEach(nom => {
			const tempObj = {
				who: nom.who,
				value: nom.value
			};
			if (!nominators.some(nom => nom.who === tempObj.who)) {
				nominators.push(tempObj);
			}
		});
	});

	//Store all the validators, electedInfo data to nominator
	const finalNominatorsList = [];
	nominators.map(nom => {
		let temp = [];
		Object.keys(validatorsInfoData).forEach(data => {
			validatorsInfoData[data].currentValidator.exposure.others.forEach(curr => {
				if (nom.who.toString() === curr.who.toString()) {
					temp.push({
						validator: data,
						staked: curr.value / 10 ** 12
					});
				}
			});
		});

		if (temp.length > 0) {
			//for reference: https://docs.google.com/document/d/13dLBH5Ngu63lCQryRW3BiiJlXlYllg_fAzAObmOh0gw/edit?pli=1
			// let sum = 0;
			// for (let i = 0; i < temp.length; i++) {
			// 	//Logic for calculating expected daily ROI
			// 	//Commission is already taken into account while calculating poolReward
			// 	const { totalStake, poolReward } = temp[i].validator.validator;
			// 	sum += (temp[0].staked / totalStake) * poolReward;
			// }

			// const ERA_PER_DAY = 4;
			// const expectedDailyRoi = (sum * ERA_PER_DAY).toFixed(3)
			// 	? (sum * ERA_PER_DAY).toFixed(3)
			// 	: 0;

			const total = temp.reduce((acc, curr) => {
				return acc + curr.staked;
			}, 0);
			const highest = Math.max(...temp.map(validator => validator.staked));
			const other = total - highest;
			finalNominatorsList.push({
				nominatorId: nom.who,
				validators: temp,
				totalStaked: parseFloat(total.toFixed(3)),
				highestStaked: parseFloat(highest.toFixed(3)),
				othersStaked: parseFloat(other.toFixed(3)),
				// expectedDailyRoi: parseFloat(expectedDailyRoi),
				backers: temp.length
			});
			temp = [];
		}
	});

	// console.log(JSON.stringify(validatorsData))

	// Fetch active validator for current session.
	

	return finalNominatorsList;
};

module.exports = nominators;
