const app = require("express")();
const mongoose = require("mongoose");
const socket_io = require("socket.io");
const Validator = require("./models/Validator.js");
const EventEmitter = require("events");
const { ApiPromise, WsProvider } = require("@polkadot/api");
const eraChange = new EventEmitter();
const config = require("config");
const configDB = config.get("DB");
const configSentryDns = config.get("SENTRY_DNS");
const EI = require("./models/ElectedInfo");
const RiskScore = require("./models/RiskScore");
const Intention = require("./models/Intention");
const ValidatorInfo = require("./models/ValidatorInfo");
const Nominator = require("./models/NominatorInfo");
const Sentry = require("@sentry/node");
// const https = require('https');
const { hexToString } = require("@polkadot/util");
const eraPointsHistory = require("./isolatedScripts/eraPointsHistory");
const validatorsIS = require("./isolatedScripts/validators")
const intentionsIS = require("./isolatedScripts/intentions")
const validatorsInfoIS = require("./isolatedScripts/validatorsInfo")
const nominatorsIS = require("./isolatedScripts/nominators")
const returnsHistory = require("./isolatedScripts/rewardsHistory")
const riskScoreCalculator = require("./isolatedScripts/riskScore")
// const getPolkaData = require("./utils/getPolkaData");
const validatorsInfos = require("./routes/validatorsInfos");
const nominatorInfos = require("./routes/nominatorinfos");
const intentions = require("./routes/intentions");
const riskscore = require("./routes/riskscore");

const _ = require("lodash");

const wsProvider = new WsProvider("wss://kusama-rpc.polkadot.io");

if (!config.get("DB")) {
	throw new Error("Database url is required!");
}

if (!config.get("SENTRY_DNS")) {
	throw new Error("Sentry dns is required!");
}

//Error Logger
Sentry.init({ dsn: configSentryDns });

//Initialize required middleware before starting the server
require("./startup/startup")(app);

const io = socket_io();
io.origins(['*:*']);

mongoose
	.connect(configDB, { useNewUrlParser: true, useUnifiedTopology: true })
	.then(() => console.log("connected to database"))
	.catch(() => console.log("database failed to connect"));

/**
 * Remove all old validators data
 * and fetch fresh validators data
 * on newEra trigger change
 */
eraChange.on("newEra", async () => {
	try {
		console.log("era func start");

		console.log("get previous eraPoints");
		const [previousEraPoints, last4Eras] = await eraPointsHistory(wsProvider);
		// console.log(JSON.stringify(previousEraPoints));
		// console.log(JSON.stringify(last4Eras))
		console.log("get rewards history")
		const rewards = await returnsHistory(last4Eras, wsProvider)

		// get active validators
		console.log("get validators");
		const validatorsData = await validatorsIS(previousEraPoints, wsProvider);
		console.log("delete previous validators");
		await Validator.deleteMany({});
		console.log('insert new validators')
		const savedValidator = await Validator.insertMany(
			JSON.parse(JSON.stringify(Object.values(validatorsData)))
		);
		// console.log(JSON.parse(JSON.stringify(validatorsData)));
		// console.log(Object.values(validatorsData))
		// const validatorsDataObject = {...(Object.values(validatorsData))}
		// console.log(JSON.stringify(validatorsDataObject))

		// get validators Info
		console.log("get validators Info");
		const [validatorsInfoData, electedInfo] = await validatorsInfoIS(
			validatorsData , rewards, wsProvider
		);
		console.log("delete previous validators Info");
		await ValidatorInfo.deleteMany({});
		console.log("get validators Info");
		await ValidatorInfo.insertMany(
			JSON.parse(JSON.stringify(Object.values(validatorsInfoData)))
		);

		console.log("get rewards/returns")
		// console.log("electedInfo");
		// console.log(JSON.stringify(electedInfo));
		// console.log("validatorsInfoData");
		// console.log(JSON.stringify(validatorsInfoData));

		//get intentions
		console.log("get intentions");
		const [intention, intentionsTotalInfo, validatorsAndIntentions, intentionsData] = await intentionsIS(
			previousEraPoints, wsProvider
		);
		console.log("delete intentions");
		await Intention.deleteMany({});
		console.log("insert intentions");
		const intentionData = new Intention({
			intentions: JSON.parse(JSON.stringify(intention)),
			validatorsAndIntentions: JSON.parse(
				JSON.stringify(validatorsAndIntentions)
			),
			info: JSON.parse(JSON.stringify(intentionsTotalInfo))
		});
		const savedIntention = await intentionData.save();
		// console.log("intention");
		// console.log(JSON.stringify(intention));
		// console.log("intentionsTotalInfo");
		// console.log(JSON.stringify(intentionsTotalInfo));
		// console.log("intentionsData");
		// console.log(JSON.stringify(intentionsData));

		// get risk score
		console.log("get risk score");
		const riskScoreData = await riskScoreCalculator(validatorsData, wsProvider);
		console.log("delete risk score");
		await RiskScore.deleteMany({});
		console.log("insert risk score");
		await RiskScore.insertMany(
			JSON.parse(JSON.stringify(riskScoreData))
		);
		// console.log("riskScoreData");
		// console.log(JSON.stringify(riskScoreData));

		// get nominatorsData
		console.log("get nominators");
		const nominatorsData = await nominatorsIS(validatorsData, rewards, wsProvider);
		console.log("delete nominators");
		await Nominator.deleteMany({});
		console.log("insert nominators");
		const savedNominator = await Nominator.insertMany(
			JSON.parse(JSON.stringify(nominatorsData))
		);
		// console.log(JSON.stringify(nominatorsData));
		// console.log('savedNominator')
		// console.log(savedNominator)

		
		let final = {};
		final.filteredValidatorsList = savedValidator;
		final.electedInfo = savedElectedInfo;
		final.intentionsData = savedIntention;
		io.emit("onDataChange", final);
		console.log("era func end");
	} catch (err) {
		console.log(err);
	}
});


// Todo change the below logic to something which is independent of externalities
(async () => {
	// const wsProvider = new WsProvider("wss://kusama-rpc.polkadot.io");
	const api = await ApiPromise.create({ provider: wsProvider });

	await api.derive.session.progress(header => {
		const eraProgress = header.eraProgress.toNumber();
		// console.log(eraLength,eraProgress,sessionLength,sessionProgress)
		//TODO: handle edge case where eraProgress equals 1 withins few minutes/seconds
		// twice thus leading to inconsistency in the data
		if ([3150, 3300, 10, 300, 600, 900, 1200, 1500, 1800, 2100, 2350, 2850].indexOf(parseInt(eraProgress)) !== -1) {
			Sentry.captureMessage(`Era changed at: ${new Date()}`);
			eraChange.emit("newEra");
		}
		console.log(`eraProgress ${parseInt(eraProgress)}`);
	});
})();

io.on("connection", async () => {
	try {
		let result = {};
		result.filteredValidatorsList = await Validator.find();
		result.electedInfo = await EI.find();
		result.intentionsData = await Intention.find();
		io.emit("initial", result);
	} catch (err) {
		console.log(err);
	}
});

app.get("/", (req, res) => {
	res.send("Api for polka analytics");
});

app.use("/", validatorsInfos);
app.use("/", nominatorInfos);
app.use("/", intentions);
app.use("/", riskscore)

app.get("/manualfetch", async (req, res) => {
	try {
		// console.log("era func start");

		// const result = await getPolkaData();
		console.log("get previous eraPoints");
		const [previousEraPoints, last4Eras] = await eraPointsHistory(wsProvider);
		// console.log(JSON.stringify(previousEraPoints));
		// console.log(JSON.stringify(last4Eras))
		
		console.log("get rewards history")
		const rewards = await returnsHistory(last4Eras, wsProvider)

		// get active validators
		console.log("get validators");
		const validatorsData = await validatorsIS(previousEraPoints, wsProvider);
		console.log("delete previous validators");
		await Validator.deleteMany({});
		console.log('insert new validators')
		await Validator.insertMany(
			JSON.parse(JSON.stringify(Object.values(validatorsData)))
		);
		// console.log(JSON.parse(JSON.stringify(validatorsData)));
		// console.log(Object.values(validatorsData))
		// const validatorsDataObject = {...(Object.values(validatorsData))}
		// console.log(JSON.stringify(validatorsDataObject))

		// get validators Info
		console.log("get validators Info");
		const [validatorsInfoData, electedInfo] = await validatorsInfoIS(
			validatorsData, rewards, wsProvider
		);
		console.log("delete previous validators Info");
		await ValidatorInfo.deleteMany({});
		console.log("get validators Info");
		await ValidatorInfo.insertMany(
			JSON.parse(JSON.stringify(Object.values(validatorsInfoData)))
		);
		// console.log("electedInfo");
		// console.log(JSON.stringify(electedInfo));
		// console.log("validatorsInfoData");
		// console.log(JSON.stringify(validatorsInfoData));

		//get intentions
		console.log("get intentions");
		const [intention, intentionsTotalInfo, validatorsAndIntentions, intentionsData] = await intentionsIS(
			previousEraPoints, wsProvider
		);
		console.log("delete intentions");
		await Intention.deleteMany({});
		console.log("insert intentions");
		const intentionData = new Intention({
			intentions: JSON.parse(JSON.stringify(intention)),
			validatorsAndIntentions: JSON.parse(
				JSON.stringify(validatorsAndIntentions)
			),
			info: JSON.parse(JSON.stringify(intentionsTotalInfo))
		});
		const savedIntention = await intentionData.save();
		// console.log("intention");
		// console.log(JSON.stringify(intention));
		// console.log("intentionsTotalInfo");
		// console.log(JSON.stringify(intentionsTotalInfo));
		// console.log("intentionsData");
		// console.log(JSON.stringify(intentionsData));

		// get risk score
		console.log("get risk score");
		const riskScoreData = await riskScoreCalculator(validatorsData, wsProvider);
		console.log("delete risk score");
		await RiskScore.deleteMany({});
		console.log("insert risk score");
		await RiskScore.insertMany(
			JSON.parse(JSON.stringify(riskScoreData))
		);
		// console.log("riskScoreData");
		// console.log(JSON.stringify(riskScoreData));

		// get nominatorsData
		console.log("get nominators");
		const nominatorsData = await nominatorsIS(validatorsData, rewards, wsProvider);
		console.log("delete nominators");
		await Nominator.deleteMany({});
		console.log("insert nominators");
		const savedNominator = await Nominator.insertMany(
			JSON.parse(JSON.stringify(nominatorsData))
		);
		// console.log(JSON.stringify(nominatorsData));
		// console.log('savedNominator')
		// console.log(savedNominator)

		res.json({ });
	} catch (err) {
		console.log("err", err);
		res.status(400).json({ err: err, message: "error bro" });
	}
});

const PORT = process.env.PORT || 3009;
const server = app.listen(PORT, () =>
	console.log(`Connected on port: ${PORT}`)
);
io.attach(server, {
	pingInterval: 300000,
	pingTimeout: 300000 * 2,
	upgradeTimeout: 300000
});
io.listen(server);

server.setTimeout(300000 * 2); // after 10 minutes
