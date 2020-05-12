const { ApiPromise, WsProvider } = require("@polkadot/api");
const { hexToString } = require("@polkadot/util");
const validators = async (previousEraPoints) => {
	// Initialise the provider to connect to the local node
	const provider = new WsProvider("wss://kusama-rpc.polkadot.io");

	// Create the API and wait until ready

	const api = await ApiPromise.create({ provider });

	// Fetch active validator for current session.
	const validators = await api.query.session.validators();

	// Fetch intention addresses for current session.
	const validatorsStakingInfo = await Promise.all(
		validators.map(authorityId => api.derive.staking.account(authorityId))
	);
	// Todo: add indexes for validators and intentions
	// const indexes = await api.derive.accounts.indexes();
	let validatorsTotalInfo = {};
	JSON.parse(JSON.stringify(validatorsStakingInfo)).map(info => {
		const totalStake =
			Object.keys(info).length > 0 && info.constructor === Object
				? info.exposure.total.toString() / 10 ** 12
				: undefined;
		console.log(totalStake);
		return validatorsTotalInfo[info.stashId.toString()] = {
			totalStake: totalStake,
			noOfNominators: info.exposure.others.length,
			eraPoints: previousEraPoints[info.stashId.toString()].eraPoints
		}
	});

	return validatorsTotalInfo;
};

module.exports = validators;
