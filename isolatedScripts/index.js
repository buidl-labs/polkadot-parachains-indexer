const { ApiPromise, WsProvider } = require("@polkadot/api");
const { hexToString } = require("@polkadot/util");
const eraPointsHistory = require("./eraPointsHistory");
const validators = require("./validators")
const intentions = require("./intentions")

async function main() {
	try {
		console.log("get previous eraPoints");
		const previousEraPoints = await eraPointsHistory();
        console.log(JSON.stringify(previousEraPoints));
        
        // get active validators
        // const validatorsData = await validators(previousEraPoints)
        // console.log((JSON.stringify(validatorsData)));
        
        //get intentions
        console.log("get intentions");
        const intentionsData = await intentions(previousEraPoints)
        console.log((JSON.stringify(intentionsData)));

        
	} catch (err) {
		console.log(err);
    }
}

main()
	.catch(console.error)
	.finally(() => process.exit());
