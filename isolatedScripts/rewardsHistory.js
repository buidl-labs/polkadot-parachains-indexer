const { ApiPromise } = require("@polkadot/api");
// const { hexToString } = require("@polkadot/util");

const rewardsHistory = async (last4Eras, provider) => {
	// Initialise the provider to connect to the local node
	// const provider = new WsProvider("wss://kusama-rpc.polkadot.io");

    // Create the API and wait until ready
    const api = await ApiPromise.create({ provider });
    const data = JSON.parse(JSON.stringify(last4Eras)) 
    let valPrefs = {}
    let valExposure = {}
    let returns = {}
    // console.log(JSON.parse(JSON.stringify(last4Eras)))
    for (let i = 0; i < data.length; i++) {
        const element = data[i];
        valExposure[data[i].eraIndex] = await Promise.all(
            Object.keys(data[i].erasRewardPoints.individual).map(x => api.query.staking.erasStakers(data[i].eraIndex, x.toString()))
        );
        valPrefs[data[i].eraIndex] = await Promise.all(
            Object.keys(data[i].erasRewardPoints.individual).map(x => api.query.staking.erasValidatorPrefs(data[i].eraIndex , x.toString()))
        );
        // console.log(JSON.stringify(Object.keys(data[i].erasRewardPoints.individual)))
        console.log(JSON.stringify(Object.keys(data[i].erasRewardPoints.individual)))
        console.log(JSON.stringify(valExposure[data[i].eraIndex]))
        console.log(JSON.stringify(valPrefs[data[i].eraIndex]))

        Object.keys(data[i].erasRewardPoints.individual).forEach((y, index) => {
            //
            // poolReward = eraPoints/totalErapoints * totalReward
            // validatorReward = (eraPoints/totalErapoints * totalReward) * ownStake/totalStake + commission
            // 
            
            // poolreward calculation
            // console.log((data[i].erasRewardPoints.individual[y]))
            // console.log(data[i].erasRewardPoints.total)
            // console.log(data[i].rewards)
            
            const poolReward = data[i].erasRewardPoints.individual[y] / data[i].erasRewardPoints.total * data[i].rewards;
            // console.log(poolReward)
            
            // validator reward calculation
            const validatorReward = (data[i].erasRewardPoints.individual[y] / data[i].erasRewardPoints.total * data[i].rewards * parseInt(valExposure[data[i].eraIndex][index].own) / parseInt(valExposure[data[i].eraIndex][index].total)) + parseInt(valPrefs[data[i].eraIndex][index].commission)
            // console.log(validatorReward)

        })



    }
    
    

	
	return ['validatorRewards', 'nominatorRewards']
	
}

module.exports = rewardsHistory;