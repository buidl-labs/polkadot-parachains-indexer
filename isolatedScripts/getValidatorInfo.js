const { ApiPromise, WsProvider } = require("@polkadot/api");
const { hexToString } = require("@polkadot/util");
let validatorList = {}
async function main() {
	// Initialise the provider to connect to the local node
	const provider = new WsProvider("wss://kusama-rpc.polkadot.io");

	// Create the API and wait until ready
	const api_ = await ApiPromise.create({ provider });
	// const name1 = await api_.derive.accounts.info('G7eJUS1A7CdcRb2Y3zEDvfAJrM1QtacgG6mPD1RsPTJXxPQ')
	// console.log(JSON.stringify(name1))
	// const indexes = await api_.derive.accounts.indexes();
	// console.log('indexes')
	// console.log(JSON.stringify(indexes))
	const electedInfo = await api_.derive.staking.electedInfo();
	const sessionValidators = await api_.query.session.validators();
	console.log('electedInfo')
	console.log(JSON.stringify(electedInfo))
	console.log('sessionValidators')
	console.log(JSON.stringify(sessionValidators))
	sessionValidators.map(validator => {
		console.log(validator.toString())
		const temp = JSON.parse(JSON.stringify(electedInfo)).info.find(
			currentValidator => {
				console.log(JSON.stringify(currentValidator))
				console.log(currentValidator.stashId)
				if (currentValidator.stashId === validator.toString()) {
					return true;
				}
			}
		);
		console.log('temp: ' + JSON.stringify(temp))
		// console.log(JSON.stringify(validatorsData[validator]))
		// validatorsData[validator].currentValidator = temp
	});
	
	}

main()
	.catch(console.error)
	.finally(() => process.exit());
