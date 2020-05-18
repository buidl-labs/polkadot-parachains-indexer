const { ApiPromise, WsProvider } = require("@polkadot/api");
const { hexToString } = require("@polkadot/util");
let validatorList = {}
async function main() {
	// Initialise the provider to connect to the local node
	const provider = new WsProvider("wss://kusama-rpc.polkadot.io");

	// Create the API and wait until ready
	const api = await ApiPromise.create({ provider });
	// const name1 = await api_.derive.accounts.info('G7eJUS1A7CdcRb2Y3zEDvfAJrM1QtacgG6mPD1RsPTJXxPQ')
	// console.log(JSON.stringify(name1))
	// const indexes = await api_.derive.accounts.indexes();
	// console.log('indexes')
	// const stakingObj = await api.query.staking
	// const rewards1 = await api.query.staking.erasValidatorReward(799)
	// const rewards2 = await api.query.staking.erasValidatorReward(798)
	// console.log(JSON.stringify(stakingObj))
	// console.log(JSON.stringify(rewards1))
	// console.log(JSON.stringify(rewards2))
	// console.log(JSON.stringify(indexes))
	const slashingInfo = await api.derive.staking.ownSlashes('ED8SS6LiptDbQZDrHCE1heKjrK6KRUz4xV95PgSba8JUvh3')
	console.log(JSON.stringify(slashingInfo))
	// const stakingInfoAddr = await api.derive.staking.account('G7eJUS1A7CdcRb2Y3zEDvfAJrM1QtacgG6mPD1RsPTJXxPQ')
	// // console.log(stakingInfoAddr)
	// console.log(JSON.stringify(stakingInfoAddr))
	// const stakingInfoAddr1 = await api.derive.staking.account('ED8SS6LiptDbQZDrHCE1heKjrK6KRUz4xV95PgSba8JUvh3')
	// // console.log(stakingInfoAddr1)
	// console.log(JSON.stringify(stakingInfoAddr1))

	// const electedInfo = await api_.derive.staking.electedInfo();
	// const sessionValidators = await api_.query.session.validators();
	// console.log('electedInfo')
	// console.log(JSON.stringify(electedInfo))
	// console.log('sessionValidators')
	// console.log(JSON.stringify(sessionValidators))
	// sessionValidators.map(validator => {
	// 	console.log(validator.toString())
	// 	const temp = JSON.parse(JSON.stringify(electedInfo)).info.find(
	// 		currentValidator => {
	// 			console.log(JSON.stringify(currentValidator))
	// 			console.log(currentValidator.stashId)
	// 			if (currentValidator.stashId === validator.toString()) {
	// 				return true;
	// 			}
	// 		}
	// 	);
	// 	console.log('temp: ' + JSON.stringify(temp))
	// 	// console.log(JSON.stringify(validatorsData[validator]))
	// 	// validatorsData[validator].currentValidator = temp
	// });
	
	}

main()
	.catch(console.error)
	.finally(() => process.exit());
