const { ApiPromise } = require("@polkadot/api");
// const { hexToString } = require("@polkadot/util");
const validatorsInfo = async (validatorsData, rewards, provider) => {
	// Initialise the provider to connect to the local node
	// const provider = new WsProvider("wss://kusama-rpc.polkadot.io");

	// Create the API and wait until ready

	const api = await ApiPromise.create({ provider });

	const electedInfo = await api.derive.staking.electedInfo();

	Object.keys(validatorsData).map(validator => {
		validatorsData[validator].rewards = []
		const temp = JSON.parse(JSON.stringify(electedInfo)).info.find(
			currentValidator => {
				// console.log(currentValidator.stashId)
				if (currentValidator.stashId === validator.toString()) {
					return true;
				}
			}
		);
		// console.log('temp: ' + JSON.stringify(temp))
		// console.log(JSON.stringify(validatorsData[validator]))
		validatorsData[validator].currentValidator = temp
		const rewardsInfo = JSON.parse(JSON.stringify(rewards)).find(
			val => {
				// console.log(currentValidator.stashId)
				if (val.stashId === validator.toString()) {
					return true;
				}
			}
		);
		// console.log('temp: ' + JSON.stringify(temp))
		// console.log(JSON.stringify(validatorsData[validator]))
		validatorsData[validator].rewards.push(rewardsInfo)
	});
	// console.log(JSON.stringify(validatorsData))

	// Fetch active validator for current session.
	return [validatorsData, electedInfo];
};

module.exports = validatorsInfo;
