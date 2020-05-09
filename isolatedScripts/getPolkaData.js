const { ApiPromise, WsProvider } = require('@polkadot/api');

async function main () {
  // Initialise the provider to connect to the local node
  const provider = new WsProvider('wss://kusama-rpc.polkadot.io');

  // Create the API and wait until ready
  const api = await ApiPromise.create({ provider });

  const historyDepth = await api.query.staking.historyDepth();
	const currentEra = await api.query.staking.currentEra();
	const lastAvailableEra = currentEra - historyDepth;

	const populateRewardHistory = async () => {
		let rewardHistoryArray = [];
		for (let i = lastAvailableEra; i < currentEra - 1; i++) {
			rewardHistoryArray.push({
				eraIndex: i,
				erasRewardPoints: await api.query.staking.erasRewardPoints(i)
			});
		}
		return rewardHistoryArray;
	};

    const rewardHistory = await populateRewardHistory();
    // console.log(rewardHistory)

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
    console.log(JSON.stringify(intentionsTotalInfo))

    const validatorsAndIntentions = [...sessionValidators, ...intentions];
    console.log(JSON.stringify(validatorsAndIntentions))


    let previousValidatorsList = {};
    rewardHistory.forEach(async ({ eraIndex, erasRewardPoints }) => {
        await Promise.all(
            Object.keys(erasRewardPoints.individual.toJSON()).forEach(
                async address => {
                    let name = `Validator (...${address.toString().slice(-6)})`;
                    const commission = await api.query.staking.erasValidatorPrefs(
                        eraIndex,
                        address.toString()
                    );

                    // try {
                    // 	const identity = await api.query.identity.identityOf(
                    // 		`${address.toString()}`
                    // 	);
                    // } catch (e) {
                    // 	throw e;
                    // }
                    // const identityJSON = identity.toJSON();
                    // console.log(identity);
                    // if (identityJSON !== (null || undefined)) {
                    // 	name = hexToString(identityJSON.info.display.Raw);
                    // }

                        previousValidatorsList[address.toString()] = {
                            stashId: address.toString(),
                            stashIdTruncated: `${address
                                .toString()
                                .slice(0, 4)}...${address.toString().slice(-6)}`,
                            points: [],
                            poolReward: "",
                            totalStake: "",
                            commission: commission.commission.toNumber() / 10 ** 7,
                            name: name
                        };
                }
            )
        ).then(
            () => {
                Object.entries(erasRewardPoints.individual.toJSON()).forEach(
                    ([address, points]) => {
                        previousValidatorsList[address.toString()].points.push(
                            points.toNumber() / erasRewardPoints.total.toNumber()
                        );
                    }
                );
            },
            err => {
                console.error(err);
            }
        );
    })

}

main().catch(console.error).finally(() => process.exit());