const { ApiPromise } = require("@polkadot/api");
// const { hexToString } = require("@polkadot/util");
const validators = async (previousEraPoints, provider) => {
	// Initialise the provider to connect to the local node
	// const provider = new WsProvider("wss://kusama-rpc.polkadot.io");

	// Create the API and wait until ready

	const api = await ApiPromise.create({ provider });

	// Fetch active validator for current session.
	const validators = await api.query.session.validators();

	// Fetch intention addresses for current session.
	const validatorsStakingInfo = await Promise.all(
		validators.map(authorityId => api.derive.staking.account(authorityId))
	);

	const accountInfo = await Promise.all(
		validators.map(addr => api.derive.accounts.info(addr))
	);
	// console.log(JSON.stringify(accountInfo))
	// Todo: add indexes for validators and intentions
	// const indexes = await api.derive.accounts.indexes();
	// console.log(JSON.parse(JSON.stringify(validatorsStakingInfo)))
	let validatorsTotalInfo = {};
	JSON.parse(JSON.stringify(validatorsStakingInfo)).map(info => {
		const totalStake =
			Object.keys(info).length > 0 && info.constructor === Object
				? info.exposure.total.toString() / 10 ** 12
				: undefined;
		// console.log(totalStake);
		const name = accountInfo.filter( i => i.accountId.toString() == info.accountId.toString())
		// console.log(name)
		// console.log(name[0].identity.display)
		let eraPoints = {};
		if (previousEraPoints[info.stashId.toString()] !== undefined) {
			eraPoints = previousEraPoints[info.stashId.toString()].eraPoints;
		}
		return validatorsTotalInfo[info.stashId.toString()] = {
			stashId: info.stashId.toString(),
			info: info,
			totalStake: totalStake,
			noOfNominators: info.exposure.others.length,
			commission: info.validatorPrefs.commission,
			eraPoints: eraPoints,
			name: name[0].identity.display
		}
	});
	// await api.disconnect();
	return validatorsTotalInfo;
};

module.exports = validators;
