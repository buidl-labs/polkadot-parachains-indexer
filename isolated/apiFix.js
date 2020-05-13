const { ApiPromise, WsProvider } = require("@polkadot/api");
const { hexToString } = require("@polkadot/util");
let validatorList = {};
async function main() {
	// Initialise the provider to connect to the local node
	const provider = new WsProvider("wss://kusama-rpc.polkadot.io");
	// Create the API and wait until ready
	const api_ = await ApiPromise.create({ provider });

	const historyDepth = await api_.query.staking.historyDepth();
	const currentEra = await api_.query.staking.currentEra();
	const lastAvailableEra = currentEra - historyDepth;
	const eraIndex = [...Array(historyDepth.toNumber()).keys()].map(
		i => i + lastAvailableEra
	);
	// console.log(eraIndex);
	const erasRewardPointsArr = await Promise.all(
		eraIndex.map(i => api_.query.staking.erasRewardPoints(i))
	);
	const rewardHistory = eraIndex.map((i, index) => {
		return { eraIndex: i, erasRewardPoints: erasRewardPointsArr[index] };
	});
	// console.log("rewardHistory" + JSON.stringify(rewardHistory));
	// console.log("rewardHistory" + rewardHistory.length);
	// console.log(eraIndex.length)
	// console.log(erasRewardPointsArr.length)
	await api_.disconnect();
	rewardHistory.forEach(element => {
		Object.keys(element.erasRewardPoints.individual.toJSON()).forEach(addr => {
			if (!(addr in validatorList)) {
				validatorList[addr] = {
					eraPoints: [
						{
							eraIndex: element.eraIndex,
							points: element.erasRewardPoints.individual.toJSON()[addr],
							total: element.erasRewardPoints.total
						}
					],
					stashId: addr.toString()
				};
			} else {
				validatorList[addr].eraPoints.push({
					eraIndex: element.eraIndex,
					points: element.erasRewardPoints.individual.toJSON()[addr],
					total: element.erasRewardPoints.total
				});
			}
		});
	});
	console.log(JSON.stringify(validatorList, null, 4));

	const api = await ApiPromise.create({ provider });
	const validatorListAddr = Object.keys(validatorList);
	// console.log(validatorListAddr)
	const commission = await Promise.all(
		validatorListAddr.map(addr => api.query.staking.validators(addr))
	);
	console.log(JSON.stringify(commission));
	const identity = await Promise.all(
		validatorListAddr.map(addr => api.query.identity.identityOf(addr))
	);
	console.log(JSON.stringify(identity));
	console.log(commission.length);
	console.log(identity.length);
	for (let i = 0; i < validatorListAddr.length; i++) {
		validatorList[validatorListAddr[i]].commission = commission[i].commission;
		const identityJSON = identity[i].toJSON();
		console.log(identity);
		if (identityJSON !== (null || undefined)) {
			validatorList[validatorListAddr[i]].name = hexToString(
				identityJSON.info.display.Raw
			);
		}
	}
	console.log("++++++++validatorList++++++++");
	console.log(validatorList);
	// Retrieve currentElected validators for current block
	const sessionValidators = await api.query.session.validators();
	const nextElected = await api.derive.staking.nextElected();
	const allStashes = await api.derive.staking.stashes();
	const accounts = allStashes.filter(
		address => !sessionValidators.includes(address)
	);
	const intentions = accounts.filter(
		accountId => !nextElected.includes(accountId)
	);
	const intentionsTotalInfo = await Promise.all(
		intentions.map(val => api.derive.staking.account(val))
	);
	const validatorsAndIntentions = [...sessionValidators, ...intentions];
	console.log(
		"validatorsAndIntentions" + JSON.stringify(validatorsAndIntentions)
	);
	// Retrieve currentElected validators for current block
	// const sessionValidators = await api.query.session.validators();
	// const nextElected = await api.derive.staking.nextElected();
	// const allStashes = await api.derive.staking.stashes();
	// const accounts = allStashes.filter(
	//  address => !sessionValidators.includes(address)
	// );
	// const intentions = accounts.filter(
	//  accountId => !nextElected.includes(accountId)
	// );
	// console.log("intentions" + intentions);
	// const intentionsTotalInfo = await Promise.all(
	//  intentions.map(val => api.derive.staking.account(val))
	// );
	// console.log("intentionsTotalInfo" + JSON.stringify(intentionsTotalInfo));
	// const validatorsAndIntentions = [...sessionValidators, ...intentions];
	// console.log(
	//  "validatorsAndIntentions" + JSON.stringify(validatorsAndIntentions)
	// );
	// // Following will extract commission wrt to each era for validators. Currently not in use.
	// const individuals = [];
	// const eraIndexArr = [];
	// rewardHistory.forEach(async ({ eraIndex, erasRewardPoints }) => {
	//  individuals.push(Object.keys(erasRewardPoints.individual.toJSON()));
	//  eraIndexArr.push(eraIndex);
	// });
	// for (let i = 0; i < individuals.length; i++) {
	//  let commissionArray = await Promise.all(
	//      individuals[i].map(individual =>
	//          api.query.staking.erasValidatorPrefs(eraIndexArr[i], individual)
	//      )
	//  );
	//  console.log("commission" + JSON.stringify(commissionArray));
	// }
}
main()
	.catch(e => console.error(e))
	.finally(() => process.exit());
