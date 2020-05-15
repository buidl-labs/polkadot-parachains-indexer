const { ApiPromise, WsProvider } = require("@polkadot/api");
const { mean, std, min, max, abs } = require("mathjs");
// const parseISO = require("date-fns/parseISO");
// const differenceInMonths = require("date-fns/differenceInMonths");

async function main() {
	const wsProvider = new WsProvider("wss://kusama-rpc.polkadot.io");
	const api = await ApiPromise.create({
		provider: wsProvider
	});
	await api.isReady;

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
    const accountsDetails = await fetch(
        `https://polka-analytic-api.herokuapp.com/validatorinfo`
    );
    const accountsDetailsJSON = await accountsDetails.json();
    // console.log(JSON.stringify(accountsDetailsJSON))
    let noOfNominatorsArr = []
    let ownStakeArr = []
    let otherStakeArr = []
    accountsDetailsJSON.forEach(element => {
        element.activeEras = element.eraPoints.length
        ownStakeArr.push(element.currentValidator.exposure.own)
        noOfNominatorsArr.push(element.noOfNominators)
        otherStakeArr.push(element.currentValidator.exposure.others.reduce((a, b) => a + b.value, 0))
    });
    const maxNom = Math.max(...noOfNominatorsArr)
    const maxOwnS = Math.max(...ownStakeArr)
    const minNom = Math.min(...noOfNominatorsArr)
    const minOwnS = Math.min(...ownStakeArr)
    const maxOthS = Math.max(...otherStakeArr)
    const minOthS = Math.min(...otherStakeArr)


    // console.log(JSON.stringify(accountsDetailsJSON))

    // Get number of nonZeroSlashes for given validator
	// const getSlashes = async accountId => {
	// 	const slashes = await api.derive.staking.ownSlashes(accountId);
	// 	const nonZeroSlashes = slashes.filter(
	// 		slash => parseFloat(slash.total) !== 0
	// 	);
	// 	return nonZeroSlashes.length;
    // };
    
    let slashesInfo ={}  
    await Promise.all(
		accountsDetailsJSON.map(async element => {
            const slashInfo = await api.derive.staking.ownSlashes(element.stashId.toString())
            const nonZeroSlashes = slashInfo.filter(
		    	slash => parseFloat(slash.total) !== 0
		    );
            return  slashesInfo[element.stashId.toString()]= { slashInfo: slashInfo, slashCount: nonZeroSlashes.length}
        })

    );
    console.log(JSON.stringify(slashesInfo))
    

	// const getValidatorInfo = async accountId => {
	// 	const validatorStakingInfo = await api.derive.staking.query(accountId);
	// 	// const accountCreationTime = await getAccountCreationTime(accountId);
	// 	const { own, total, others } = validatorStakingInfo.exposure;
	// 	// const activeTime = differenceInMonths(
	// 	// 	Date.now(),
	// 	// 	accountCreationTime.toNumber()
	// 	// );
	// 	const activeTime = 7

	// 	// NOTE: it's important to use the raw numbers instead of dividing by 10 ** 12 to get the amount is standard unit (KSM or DOT), else the numbers less than 1 KSM/DOT in ownStake or any other stake lead to drastically higher risk scores which aren't a good depiction of the actual risk
	// 	return {
	// 		ownStake: own,
	// 		otherStake: total - own,
	// 		totalStake: total,
	// 		nominations: others.length,
	// 		slashes: await getSlashes(accountId),
	// 		activeTimeInMonths: activeTime
	// 	};
	// };

	// const getRiskScore = async accountId => {
	// 	const {
	// 		ownStake,
	// 		otherStake,
	// 		totalStake,
	// 		nominations,
	// 		slashes,
	// 		activeTimeInMonths
	// 	} = await getValidatorInfo(accountId);
	// 	const riskScore =
	// 		(1 + slashes) / activeTimeInMonths +
	// 		1 / nominations +
	// 		1 / ownStake +
	// 		1 / otherStake +
	// 		1 / totalStake;
	// 	return riskScore;
    // };
    // scaling data between 1 = a and 100 = b
    let riskScoreArr=[]
    function scaleData(val, max, min) { return (val - min) / (max - min) * (100-1) + 1; }
    function normalizeData(val, max, min) { return (val - min) / (max - min); }
    accountsDetailsJSON.forEach(element => {
        const otherStake = element.currentValidator.exposure.others.reduce((a, b) => a + b.value, 0)
        // console.log(element.currentValidator.exposure.own)
        const slashScore = (1 + slashesInfo[element.stashId].slashCount) / element.activeEras
        const backersScore = 1 / scaleData(element.noOfNominators, maxNom, minNom)
        const validatorOwnRisk = 1 / scaleData(element.currentValidator.exposure.own, maxOwnS, minOwnS)
        const riskScore = slashScore + backersScore + validatorOwnRisk + (1 / scaleData(otherStake, maxOthS, minOthS)) ;
        riskScoreArr.push({riskScore: riskScore, stashId: element.stashId})
        console.log('stashId: ' + element.stashId.toString() + ' slashScore: ' + slashScore.toFixed(3) + ' backersScore: ' + backersScore.toFixed(3) + ' ownStake: ' + validatorOwnRisk +' otherStake: '+  (1 / scaleData(otherStake, maxOthS, minOthS)).toFixed(3) + ' riskScore: ' + riskScore.toFixed(3) )
    });
    const maxRS = Math.max(...riskScoreArr.map( x => x.riskScore ))
    const minRS = Math.min(...riskScoreArr.map( x => x.riskScore ))
    riskScoreArr.forEach(x => {
        console.log('stashId: ' + x.stashId + ' normalizedRS: ' + normalizeData(x.riskScore, maxRS, minRS)  )
    })

	// const getRiskLevels = async () => {
	// 	let riskArr = [];
	// 	const sessionValidators = await api.query.session.validators();
	// 	await Promise.all(
	// 		sessionValidators.map(async val => await getRiskScore(val))
	// 	).then(logger => {
	// 		riskArr = logger;
	// 	});

	// 	// Normalize risk
	// 	const meanRisk = mean(riskArr);
	// 	const stdRisk = std(riskArr);
	// 	const zScore = riskArr.map(risk => (risk - meanRisk) / stdRisk);
	// 	const normalizedRiskScore = zScore.map(
	// 		score => (score - min(zScore)) / (max(zScore) - min(zScore))
	// 	);
	// 	return normalizedRiskScore;
	// };
	// await getRiskLevels().then(value => console.log(value));
	// process.exit()
};

main()
	.catch(console.error)
	.finally(() => process.exit());