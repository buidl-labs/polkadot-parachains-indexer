const { ApiPromise } = require("@polkadot/api");
// const { hexToString } = require("@polkadot/util");

const getPolkaData = async (provider) => {
	// Initialise the provider to connect to the local node
	// const provider = new WsProvider("wss://kusama-rpc.polkadot.io");

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
	// await api_.disconnect();

	let validatorList = {}
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
    
    return validatorList

}

module.exports = getPolkaData;