const app = require("express")();
const mongoose = require("mongoose");
const socket_io = require("socket.io");
const Validator = require("./models/Validator.js");
const filteredValidatorData = require("./utils/filteredValidatorData");
const getElectedInfo = require("./utils/getElectedInfo");
const EventEmitter = require("events");
const { ApiPromise, WsProvider } = require("@polkadot/api");
const eraChange = new EventEmitter();
const config = require("config");
const configDB = config.get("DB");
const configSentryDns = config.get("SENTRY_DNS");
const EI = require("./models/ElectedInfo");
const Sentry = require('@sentry/node');
const https = require("https");

if (!config.get('DB')) {
    throw new Error('Database url is required!');
}

if (!config.get('SENTRY_DNS')) {
    throw new Error('Sentry dns is required!');
}

//Error Logger
Sentry.init({ dsn: configSentryDns });

//Initialize required middleware before starting the server
require("./startup/startup")(app);

const io = socket_io();

mongoose.connect(configDB, {useNewUrlParser: true,  useUnifiedTopology: true})
.then(() => console.log("connected to database"))
.catch(() => console.log("database failed to connect"));

/**
 * Remove all old validators data
 * and fetch fresh validators data
 * on newEra trigger change
 */
eraChange.on("newEra", async () => {
    try{
        let result = {};
        await Validator.deleteMany({});
        await EI.deleteMany({});
        let validators = await filteredValidatorData();
        result.filteredValidatorsList = await Validator.insertMany(validators)
        result.electedInfo = await getElectedInfo();
        io.emit('onDataChange', result);
    }catch(err){
        console.log(err);
    }

});

setInterval(async () => {
    const wsProvider = new WsProvider("wss://kusama-rpc.polkadot.io");
    const api = await ApiPromise.create({ provider: wsProvider });
    await api.isReady;
    let previousEraIndex = await api.query.staking.currentEra();
	api.query.staking.currentEra(current => {
		const change = current.sub(previousEraIndex);
		if (!change.isZero()) {
			// console.log("era change");
			previousEraIndex = current;
			eraChange.emit("newEra");
		} else{
            // console.log("no change");
        }
            
    });
}, 60000)


io.on('connection', async () => {
    try{
        let result = {};
        result.filteredValidatorsList = await Validator.find();
        result.electedInfo = await EI.find();
        if(!(result.filteredValidatorsList.length > 0)){
            let validators = await filteredValidatorData();
            result.filteredValidatorsList = await Validator.insertMany(validators)
            result.electedInfo = await getElectedInfo();
        }
        io.emit("initial", result);
    }catch(err){
        console.log(err);
    }
});

app.get("/", (req, res) => {
    res.send("Api for polka analytics");
})

//To keep heroku dyno awake
setInterval(function () {
    https.get("https://evening-sea-52088.herokuapp.com/");
}, 300000 * 5); // every 5 minutes (300000)

const PORT = process.env.PORT || 3004;
const server = app.listen(PORT, () => console.log(`Connected on port: ${PORT}`));
io.listen(server);
