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
const Intention = require("./models/Intention");
const ValidatorInfo = require("./models/ValidatorInfo");
const Nominator = require("./models/NominatorInfo");
const Sentry = require("@sentry/node");
// const https = require('https');
const { hexToString } = require("@polkadot/util");
const getPolkaData = require("./utils/getPolkaData");
const validatorsInfos = require("./routes/validatorsInfos");
const nominatorInfos = require("./routes/nominatorinfos");
const intentions = require("./routes/intentions");

const _ = require("lodash");

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

		const result = await getPolkaData();

		let final = {};
		await Validator.deleteMany({});
		await EI.deleteMany({});
		await Intention.deleteMany({});
		await ValidatorInfo.deleteMany({});
		await Nominator.deleteMany({});

		await Nominator.insertMany(
			JSON.parse(JSON.stringify(result.finalNominatorsList))
		);

		const savedValidator = await Validator.insertMany(
			JSON.parse(JSON.stringify(result.filteredValidatorData))
		);

		const electedInfoData = new EI(
			JSON.parse(JSON.stringify(result.electedInfo))
		);
		const savedElectedInfo = await electedInfoData.save();

		await ValidatorInfo.insertMany(
			JSON.parse(JSON.stringify(result.filteredValidatorInfos))
		);

		const intentionData = new Intention({
			intentions: JSON.parse(JSON.stringify(result.intentions)),
			validatorsAndIntentions: JSON.parse(
				JSON.stringify(result.validatorsAndIntentions)
			),
			info: JSON.parse(JSON.stringify(result.intentionsTotalInfo))
		});
		const savedIntention = await intentionData.save();

		final.filteredValidatorsList = savedValidator;
		final.electedInfo = savedElectedInfo;
		final.intentionsData = savedIntention;
		io.emit("onDataChange", final);
		console.log("era func end");
	} catch (err) {
		console.log(err);
	}
});

(async () => {
	const wsProvider = new WsProvider("wss://kusama-rpc.polkadot.io");
	const api = await ApiPromise.create({ provider: wsProvider });

	await api.derive.session.progress(header => {
		const eraProgress = header.eraProgress.toNumber();
		// console.log(eraLength,eraProgress,sessionLength,sessionProgress)
		//TODO: handle edge case where eraProgress equals 1 withins few minutes/seconds
		//twice thus leading to inconsistency in the data
		if (parseInt(eraProgress) === 1) {
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

app.get("/manualfetch", async (req, res) => {
	try {
		const result = await getPolkaData();

		await Validator.deleteMany({});
		await EI.deleteMany({});
		await Intention.deleteMany({});
		await ValidatorInfo.deleteMany({});
		await Nominator.deleteMany({});

		const savedValidator = await Validator.insertMany(
			JSON.parse(JSON.stringify(result.filteredValidatorData))
		);

		const electedInfoData = new EI(
			JSON.parse(JSON.stringify(result.electedInfo))
		);
		const savedElectedInfo = await electedInfoData.save();

		await ValidatorInfo.insertMany(
			JSON.parse(JSON.stringify(result.filteredValidatorInfos))
		);

		const intentionData = new Intention({
			intentions: JSON.parse(JSON.stringify(result.intentions)),
			validatorsAndIntentions: JSON.parse(
				JSON.stringify(result.validatorsAndIntentions)
			),
			info: JSON.parse(JSON.stringify(result.intentionsTotalInfo))
		});
		const savedIntention = await intentionData.save();

		await Nominator.insertMany(
			JSON.parse(JSON.stringify(result.finalNominatorsList))
		);

		res.json({ savedValidator, savedElectedInfo, savedIntention });
	} catch (err) {
		console.log("err", err);
		res.status(400).json({ err: err, message: "error bro" });
	}
});

// app.get('/yo', async (req, res) => {
//   try {
//     const wsProvider = new WsProvider('wss://kusama-rpc.polkadot.io');
//     const api = await ApiPromise.create({ provider: wsProvider });
//     // Retrieve all validators
//     const allValidators = await api.query.staking.validators();
//     // Parse validators
//     const parsedValidators = JSON.parse(JSON.stringify(allValidators))[0];
//     // Retrieve session validators
//     const sessionValidators = await api.query.session.validators();
//     const intentions = await parsedValidators.filter(
//       validator => !sessionValidators.includes(validator)
//     );

//     const intentionstotalinfo = await Promise.all(
//       intentions.map(val => api.derive.staking.account(val))
//     );

//     res.json(JSON.parse(JSON.stringify(intentionstotalinfo)));
//   } catch (err) {
//     console.log(err);
//   }
// });

//To keep heroku dyno awake
// setInterval(function() {
//   https.get('https://evening-sea-52088.herokuapp.com/');
// }, 300000 * 5); // every 5 minutes (300000)

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
