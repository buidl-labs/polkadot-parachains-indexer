const { ApiPromise } = require("@polkadot/api");
const { hexToString } = require("@polkadot/util");
const intentions = async (previousEraPoints, provider) => {
	// Initialise the provider to connect to the local node
	// const provider = new WsProvider("wss://kusama-rpc.polkadot.io");

	// Create the API and wait until ready

	const api = await ApiPromise.create({ provider });

	const allStashes = await api.derive.staking.stashes();

	// Fetch active validator for current session.
	const activeValidators = await api.query.session.validators();

	// Fetch intention addresses for current session.
	const intentions = allStashes.filter(
		address => !activeValidators.includes(address)
	);

	//
	// get staking info
	//
	const intentionsStakingInfo = await Promise.all(
		intentions.map(authorityId => api.derive.staking.account(authorityId))
	);

	const accountInfo = await Promise.all(
		intentions.map(addr => api.derive.accounts.info(addr))
	);
	const validatorsAndIntentions = [...activeValidators, ...intentions];

	//
	//
	// 

	let intentionsAccountInfo = {};
	// console.log("previousEraPoints");
	// console.log(JSON.stringify(previousEraPoints));

	JSON.parse(JSON.stringify(intentionsStakingInfo)).map(info => {
		const totalStake =
			Object.keys(info).length > 0 && info.constructor === Object
				? info.exposure.total.toString() / 10 ** 12
				: undefined;
		// console.log(totalStake);
		// console.log(previousEraPoints[info.stashId.toString()]);
		const name = accountInfo.filter( i => i.accountId.toString() == info.accountId.toString())
		// console.log(name)
		// console.log(name[0].identity.display)
		let eraPoints = {};
		if (previousEraPoints[info.stashId.toString()] !== undefined) {
			eraPoints = previousEraPoints[info.stashId.toString()].eraPoints;
		}
		return (intentionsAccountInfo[info.stashId.toString()] = {
			stashId: info.stashId.toString(),
			totalStake: totalStake,
			noOfNominators: info.exposure.others.length,
			commission: info.validatorPrefs.commission,
			eraPoints: eraPoints,
			name: name[0].identity.display
		});
	});
	return [intentions, intentionsStakingInfo, validatorsAndIntentions, intentionsAccountInfo];
};

module.exports = intentions;
