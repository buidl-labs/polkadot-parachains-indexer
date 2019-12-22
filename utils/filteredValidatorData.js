const { ApiPromise, WsProvider } = require("@polkadot/api");
const { hexToString } = require("@polkadot/util");


async function createApi(){
    // console.log(`Connecting to API...`);
    const wsProvider = new WsProvider("wss://kusama-rpc.polkadot.io");
    const api = await ApiPromise.create({ provider: wsProvider });
    await api.isReady;
    // console.log(`API is ready`);
    // console.clear();
    // Fetch recent reward events from Polkascan
    const res = await fetch(
        "https://polkascan.io/kusama-cc3/api/v1/event?&filter[module_id]=staking&filter[event_id]=Reward&page[size]=10"
    );
    const json = await res.json();
    const rewardData = await json.data;

    // Retrieve currentElected validators for current block
    const currentValidators = await api.query.staking.currentElected();
    // Retrieve all validators
    // const allValidators = await api.query.staking.validators();
    
    // Parse validators
    // const parsedValidators = JSON.parse(JSON.stringify(allValidators))[0];
    // Retrieve session validators
    
    // const sessionValidators = await api.query.session.validators();
    
    // const intentions = await parsedValidators.filter(
    // 	validator => !sessionValidators.includes(validator)
    // );
    // const validatorsAndIntentions = [...sessionValidators, ...intentions];
    // Retrieve the last known era reward
    const reward = await rewardData[0].attributes.attributes[0].value;
    // Retrieve the hashes of the end of era blocks
    const hash = await Promise.all(
        rewardData.map(data =>
            api.rpc.chain.getBlockHash(data.attributes.block_id - 1)
        )
    );
    // Retrieve the era points for all end of era blocks
    const eraPoints = await Promise.all(
        hash.map(data =>
            api.query.staking.currentEraPointsEarned.at(`${data.toString()}`)
        )
    );
    // Retrieve an array of the list of all elected validators at the end of era blocks
    const validatorList = await Promise.all(
        hash.map(data =>
            api.query.staking.currentElected.at(`${data.toString()}`)
        )
    );

    let result = {};

    await Promise.all(
        validatorList.map(async validator => {
            await Promise.all(
                validator.map(async address => {
                    const commission = await api.query.staking.validators(address);
                    const name = await api.query.nicks.nameOf(`${address.toString()}`);
                    result[address] = {
                        stashId: address.toString(),
                        stashIdTruncated: `${address
                            .toString()
                            .slice(0, 4)}...${address.toString().slice(-6, -1)}`,
                        points: [],
                        poolReward: "",
                        totalStake: "",
                        commission: commission[0].commission.toNumber() / 10 ** 7,
                        name: name.raw[0]
                            ? hexToString(name.raw[0].toString())
                            : `Validator (...${address.toString().slice(-6, -1)})`
                    };
                })
            );
        })
    );

    eraPoints.map((eraPoint, index) => {
        eraPoint.individual.map((point, validatorIndex) => {
            result[validatorList[index][validatorIndex]].points.push(
                point.toNumber() / eraPoint.total.toNumber()
            );
            return 0;
        });
        return 0;
    });

    const validatorData = await Promise.all(
        Object.keys(result).map(async (key, index) => {
            const validatorPoolReward =
                ((result[key].points.reduce((acc, curr) => acc + curr, 0) /
                    result[key].points.length) *
                    reward) /
                10 ** 12;
            const electedInfo = await api.derive.staking.electedInfo();
            const stakeInfo = await api.derive.staking.account(key.toString());
            const totalStake =
                stakeInfo !== undefined
                    ? stakeInfo.stakers.total.toString() / 10 ** 12
                    : undefined;
            result[key].totalStake = totalStake;
            result[key].poolReward = isNaN(validatorPoolReward)
                ? "Not enough data"
                : (1 - result[key].commission / 100) * validatorPoolReward;
            //TODO: Keep in mind electedInfo has dependency on nominator and validator specific views
            // setElectedInfo(electedInfo);
            return result[key];
        })
    );
    const filteredValidatorData = validatorData.filter(curr =>
        currentValidators.includes(curr.stashId)
    );
    // setApiConnected(true);
    // setValidatorData(filteredValidatorData);
    // setIntentionData(intentions);
    // setValidatorsAndIntentions(validatorsAndIntentions);
    // console.log("filteredValidatorData", filteredValidatorData);
    return filteredValidatorData;
};

module.exports = createApi;