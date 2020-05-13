const { ApiPromise, WsProvider } = require("@polkadot/api");
const { mean, std, min, max, abs } = require("mathjs");
const parseISO = require("date-fns/parseISO");
const differenceInMonths = require("date-fns/differenceInMonths");

const createApi = async () => {
	const wsProvider = new WsProvider("wss://kusama-rpc.polkadot.io");
	const api = await ApiPromise.create({
		provider: wsProvider
	});
	await api.isReady;

	// Get number of nonZeroSlashes for given validator
	const getSlashes = async accountId => {
		const slashes = await api.derive.staking.ownSlashes(accountId);
		const nonZeroSlashes = slashes.filter(
			slash => parseFloat(slash.total) !== 0
		);
		return nonZeroSlashes.length;
	};
	// TODO: Fix blockTimestamp API call issue for older blocks
	// const getBlockTimestamp = async blockNumber => {
	// 	let blockData = undefined;
	// 	let timestamp = undefined
	// 	const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
	// 	try {
	// 		blockData = await api.rpc.chain.getBlock(blockHash);
	// 	} catch (error) {
	// 		blockData = null
	// 	}
	// 	if (blockData === null) {
	// 		timestamp = parseISO("2019-11-29");
	// 	} else {
	// 		timestamp = blockData.block.extrinsics[0].method.args[0];
	// 	}
	// 	return timestamp;
	// };

	// TODO: Find an alternative for getting creationTime - i.e. remove dependency from Polkascan
	const getAccountCreationTime = async accountId => {
		const polkascanAccountDetails = await fetch(
			`https://api-01.polkascan.io/kusama/api/v1/account/${accountId}`
		);
		const polkascanAccountDetailsJSON = await polkascanAccountDetails.json();
		const creationBlockNumber =
			polkascanAccountDetailsJSON.data.attributes.created_at_block;
		const creationTime = await getBlockTimestamp(creationBlockNumber);
		return creationTime;
	};

	const getValidatorInfo = async accountId => {
		const validatorStakingInfo = await api.derive.staking.query(accountId);
		// const accountCreationTime = await getAccountCreationTime(accountId);
		const { own, total, others } = validatorStakingInfo.exposure;
		// const activeTime = differenceInMonths(
		// 	Date.now(),
		// 	accountCreationTime.toNumber()
		// );
		const activeTime = 7

		// NOTE: it's important to use the raw numbers instead of dividing by 10 ** 12 to get the amount is standard unit (KSM or DOT), else the numbers less than 1 KSM/DOT in ownStake or any other stake lead to drastically higher risk scores which aren't a good depiction of the actual risk
		return {
			ownStake: own,
			otherStake: total - own,
			totalStake: total,
			nominations: others.length,
			slashes: await getSlashes(accountId),
			activeTimeInMonths: activeTime
		};
	};

	const getRiskScore = async accountId => {
		const {
			ownStake,
			otherStake,
			totalStake,
			nominations,
			slashes,
			activeTimeInMonths
		} = await getValidatorInfo(accountId);
		const riskScore =
			(1 + slashes) / activeTimeInMonths +
			1 / nominations +
			1 / ownStake +
			1 / otherStake +
			1 / totalStake;
		return riskScore;
	};

	const getRiskLevels = async () => {
		let riskArr = [];
		const sessionValidators = await api.query.session.validators();
		await Promise.all(
			sessionValidators.map(async val => await getRiskScore(val))
		).then(logger => {
			riskArr = logger;
		});

		// Normalize risk
		const meanRisk = mean(riskArr);
		const stdRisk = std(riskArr);
		const zScore = riskArr.map(risk => (risk - meanRisk) / stdRisk);
		const normalizedRiskScore = zScore.map(
			score => (score - min(zScore)) / (max(zScore) - min(zScore))
		);
		return normalizedRiskScore;
	};
	await getRiskLevels().then(value => console.log(value));
	process.exit()
};

createApi();
