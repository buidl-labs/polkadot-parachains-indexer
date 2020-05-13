const { ApiPromise, WsProvider } = require("@polkadot/api");
const { hexToString } = require("@polkadot/util");
const eraPointsHistory = require("./eraPointsHistory");
const validators = require("./validators");
const intentions = require("./intentions");
const validatorsInfo = require("./validatorsInfo");
const nominators = require("./nominators");

async function main() {
	try {
		console.log("get previous eraPoints");
		const previousEraPoints = await eraPointsHistory();
		console.log(JSON.stringify(previousEraPoints));

		// get active validators
		console.log("get validators");
		const validatorsData = await validators(previousEraPoints);
		console.log(JSON.stringify(validatorsData));

		// get validators Info
		console.log("get validators Info");
		const [validatorsInfoData, electedInfo] = await validatorsInfo(
			validatorsData
		);
		console.log("electedInfo");
		console.log(JSON.stringify(electedInfo));
		console.log("validatorsInfoData");
		console.log(JSON.stringify(validatorsInfoData));

		//get intentions
		console.log("get intentions");
		const [intention, intentionsTotalInfo, validatorsAndIntentions, intentionsData] = await intentions(
			previousEraPoints
		);
		console.log("intention");
		console.log(JSON.stringify(intention));
		console.log("intentionsTotalInfo");
		console.log(JSON.stringify(intentionsTotalInfo));
		console.log("intentionsData");
		console.log(JSON.stringify(intentionsData));

		// get nominatorsData
		console.log("get nominators");
		const nominatorsData = await nominators(validatorsInfoData);
		console.log(JSON.stringify(nominatorsData));
	} catch (err) {
		console.log(err);
	}
}

main()
	.catch(console.error)
	.finally(() => process.exit());
