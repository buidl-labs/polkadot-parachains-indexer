const { ApiPromise } = require("@polkadot/api");
// const { hexToString } = require("@polkadot/util");

const eraPointsHistory = async (provider) => {
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
	let rewardsWithEraIndex = {}
	const rewards = await Promise.all(
		eraIndex.map(i => api_.query.staking.erasValidatorReward(i))
	)
	rewards.forEach((x, i) => {
		rewardsWithEraIndex[eraIndex[i]] = x
	})
	const erasRewardPointsArr = await Promise.all(
		eraIndex.map(i => api_.query.staking.erasRewardPoints(i))
	);

	const pointsHistory = eraIndex.map((i, index) => {
		return { eraIndex: i, erasRewardPoints: erasRewardPointsArr[index] };
	});
	// console.log("pointsHistory" + JSON.stringify(pointsHistory));
	// console.log(eraIndex.length)
	// console.log(erasRewardPointsArr.length)
	// await api_.disconnect();
	let last4Eras = pointsHistory.slice(Math.max(pointsHistory.length - 4, 0))
	last4Eras.map(x => {
		x.rewards =rewardsWithEraIndex[x.eraIndex]
	})

	let validatorList = {}
	pointsHistory.forEach(element => {
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
    
	return [validatorList, last4Eras]
	
}

module.exports = eraPointsHistory;