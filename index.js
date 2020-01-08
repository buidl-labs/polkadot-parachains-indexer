const app = require("express")();
const mongoose = require("mongoose");
const socket_io = require("socket.io");
const Validator = require("./models/Validator.js");
const filteredValidatorData = require("./utils/filteredValidatorData");
const getElectedInfo = require("./utils/getElectedInfo");
const getValidatorsAndIntentions = require("./utils/validatorsAndIntentions");
const EventEmitter = require("events");
const { ApiPromise, WsProvider } = require("@polkadot/api");
const eraChange = new EventEmitter();
const config = require("config");
const configDB = config.get("DB");
const configSentryDns = config.get("SENTRY_DNS");
const EI = require("./models/ElectedInfo");
const Intention = require("./models/Intention");
const Sentry = require('@sentry/node');
const https = require("https");
const { hexToString } = require("@polkadot/util");


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

const createApi = async () => {
    // console.log(`Connecting to API...`);
    let electedInfo;
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
    const allValidators = await api.query.staking.validators();
    // Parse validators
    const parsedValidators = JSON.parse(JSON.stringify(allValidators))[0];
    // Retrieve session validators
    const sessionValidators = await api.query.session.validators();
    const intentions = await parsedValidators.filter(
      validator => !sessionValidators.includes(validator)
    );
    const validatorsAndIntentions = [...sessionValidators, ...intentions];
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
      hash.map(data => api.query.staking.currentElected.at(`${data.toString()}`))
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
        electedInfo = await api.derive.staking.electedInfo();
        const stakeInfo = await api.derive.staking.account(key.toString());
        const totalStake =
        Object.keys(stakeInfo).length === 0 && stakeInfo.constructor === Object
            ? stakeInfo.stakers.total.toString() / 10 ** 12
            : undefined;
        result[key].totalStake = totalStake;
        result[key].poolReward = isNaN(validatorPoolReward)
          ? "Not enough data"
          : (1 - result[key].commission / 100) * validatorPoolReward;
        //   setElectedInfo(electedInfo);
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
    return {
      filteredValidatorData,
      intentions,
      validatorsAndIntentions,
      electedInfo
    };
  };

/**
 * Remove all old validators data
 * and fetch fresh validators data
 * on newEra trigger change
 */
eraChange.on("newEra", async () => {
    try{
        console.log("era func start");
        let final = {};
        await Validator.deleteMany({});
        await EI.deleteMany({});
        await Intention.deleteMany({});
        const result = await createApi();

        const savedValidator = await Validator.insertMany(
          JSON.parse(JSON.stringify(result.filteredValidatorData))
        );
    
        const electedInfoData = new EI(
          JSON.parse(JSON.stringify(result.electedInfo))
        );
        const savedElectedInfo = await electedInfoData.save();
    
        const intentionData = new Intention({
          intentions: JSON.parse(JSON.stringify(result.intentions)),
          validatorsAndIntentions: JSON.parse(
            JSON.stringify(result.validatorsAndIntentions)
          )
        });
        const savedIntention = await intentionData.save();
        final.filteredValidatorsList = savedValidator
        final.electedInfo = savedElectedInfo
        final.intentionsData = savedIntention;
        io.emit('onDataChange', final);
        console.log("era func end");
    }catch(err){
        console.log(err);
    }

});

(async () => {
    const wsProvider = new WsProvider("wss://kusama-rpc.polkadot.io");
    const api = await ApiPromise.create({ provider: wsProvider });

    await api.derive.session.info(header => {
      const eraProgress = header.eraProgress.toString();
      // console.log(eraLength,eraProgress,sessionLength,sessionProgress)
      if(parseInt(eraProgress) === 0){
        Sentry.captureMessage(`Era changed at: ${new Date()}`);
        eraChange.emit("newEra");
      }
      console.log(`eraProgress ${parseInt(eraProgress)}`);
    });
})()

io.on('connection', async () => {
    try{
        let result = {};
        result.filteredValidatorsList = await Validator.find();
        result.electedInfo = await EI.find();
        result.intentionsData = await Intention.find();
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

const PORT = process.env.PORT || 3006;
const server = app.listen(PORT, () => console.log(`Connected on port: ${PORT}`));
io.attach(server, {
  pingInterval: 300000,
  pingTimeout: 300000 * 2,
  upgradeTimeout: 300000,
})
io.listen(server);

server.setTimeout(300000 * 2) // after 10 minutes