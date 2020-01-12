const app = require('express')();
const mongoose = require('mongoose');
const socket_io = require('socket.io');
const Validator = require('./models/Validator.js');
const EventEmitter = require('events');
const { ApiPromise, WsProvider } = require('@polkadot/api');
const eraChange = new EventEmitter();
const config = require('config');
const configDB = config.get('DB');
const configSentryDns = config.get('SENTRY_DNS');
const EI = require('./models/ElectedInfo');
const Intention = require('./models/Intention');
const ValidatorInfo = require('./models/ValidatorInfo');
const Sentry = require('@sentry/node');
const https = require('https');
const { hexToString } = require('@polkadot/util');
const getPolkaData = require('./utils/getPolkaData');
const validatorsInfos = require('./routes/validatorsInfos');
const _ = require('lodash');

if (!config.get('DB')) {
  throw new Error('Database url is required!');
}

if (!config.get('SENTRY_DNS')) {
  throw new Error('Sentry dns is required!');
}

//Error Logger
Sentry.init({ dsn: configSentryDns });

//Initialize required middleware before starting the server
require('./startup/startup')(app);

const io = socket_io();

mongoose
  .connect(configDB, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('connected to database'))
  .catch(() => console.log('database failed to connect'));

/**
 * Remove all old validators data
 * and fetch fresh validators data
 * on newEra trigger change
 */
eraChange.on('newEra', async () => {
  try {
    console.log('era func start');
    let final = {};
    await Validator.deleteMany({});
    await EI.deleteMany({});
    await Intention.deleteMany({});
    await ValidatorInfo.deleteMany({});

    const result = await getPolkaData();

    const savedValidator = await Validator.insertMany(
      JSON.parse(JSON.stringify(result.filteredValidatorData))
    );

    const electedInfoData = new EI(
      JSON.parse(JSON.stringify(result.electedInfo))
    );
    const savedElectedInfo = await electedInfoData.save();

    await ValidatorInfo.insertMany(
      JSON.parse(JSON.stringify(result.electedInfo.info))
    );

    const intentionData = new Intention({
      intentions: JSON.parse(JSON.stringify(result.intentions)),
      validatorsAndIntentions: JSON.parse(
        JSON.stringify(result.validatorsAndIntentions)
      )
    });
    const savedIntention = await intentionData.save();
    final.filteredValidatorsList = savedValidator;
    final.electedInfo = savedElectedInfo;
    final.intentionsData = savedIntention;
    io.emit('onDataChange', final);
    console.log('era func end');
  } catch (err) {
    console.log(err);
  }
});

(async () => {
  const wsProvider = new WsProvider('wss://kusama-rpc.polkadot.io');
  const api = await ApiPromise.create({ provider: wsProvider });

  await api.derive.session.info(header => {
    const eraProgress = header.eraProgress.toString();
    // console.log(eraLength,eraProgress,sessionLength,sessionProgress)
    if (parseInt(eraProgress) === 0) {
      Sentry.captureMessage(`Era changed at: ${new Date()}`);
      eraChange.emit('newEra');
    }
    console.log(`eraProgress ${parseInt(eraProgress)}`);
  });
})();

io.on('connection', async () => {
  try {
    let result = {};
    result.filteredValidatorsList = await Validator.find();
    result.electedInfo = await EI.find();
    result.intentionsData = await Intention.find();
    io.emit('initial', result);
  } catch (err) {
    console.log(err);
  }
});

app.get('/', (req, res) => {
  res.send('Api for polka analytics');
});

app.use('/', validatorsInfos);

app.get('/manualfetch', async (req, res) => {
  try {
    await Validator.deleteMany({});
    await EI.deleteMany({});
    await Intention.deleteMany({});
    await ValidatorInfo.deleteMany({});

    const result = await getPolkaData();

    const savedValidator = await Validator.insertMany(
      JSON.parse(JSON.stringify(result.filteredValidatorData))
    );

    const electedInfoData = new EI(
      JSON.parse(JSON.stringify(result.electedInfo))
    );
    const savedElectedInfo = await electedInfoData.save();

    await ValidatorInfo.insertMany(
      JSON.parse(JSON.stringify(result.electedInfo.info))
    );

    const intentionData = new Intention({
      intentions: JSON.parse(JSON.stringify(result.intentions)),
      validatorsAndIntentions: JSON.parse(
        JSON.stringify(result.validatorsAndIntentions)
      )
    });
    const savedIntention = await intentionData.save();

    res.json({ savedValidator, savedElectedInfo, savedIntention });
  } catch (err) {
    console.log('err', err);
    res.status(400).json({ err: err, message: 'error bro' });
  }
});

app.get('/nominator', async (req, res) => {
  try {
    const validators = await Validator.find();
    const validatorInfo = await ValidatorInfo.find();
    const newData = validators.map(validator => {
      const temp = validatorInfo.find(currentValidator => {
        if (currentValidator.stashId === validator.stashId) {
          return true;
        }
      });
      return {
        electedInfo: temp,
        validator: validator
      };
    });
    const nominators = [];
    newData.forEach(data => {
      data.electedInfo.stakers.others.forEach(nom => {
        const tempObj = { who: nom.who, value: nom.value };
        if (!_.some(nominators, tempObj)) {
          nominators.push(tempObj);
        }
      });
    });

    const final = [];
    nominators.map(nom => {
      let temp = [];
      newData.forEach(data => {
        data.electedInfo.stakers.others.forEach(curr => {
          if (nom.who.toString() === curr.who.toString()) {
            temp.push({
              validator: data,
              staked: curr.value / 10 ** 12
            });
          }
        });
      });

      if (temp.length > 0) {
        //for reference: https://docs.google.com/document/d/13dLBH5Ngu63lCQryRW3BiiJlXlYllg_fAzAObmOh0gw/edit?pli=1
        let sum = 0;
        for (let i = 0; i < temp.length; i++) {
          //Logic for calculating expected daily ROI
          //Commission is already taken into account while calculating poolReward
          const { totalStake, poolReward } = temp[i].validator.validator;
          sum += (temp[0].staked / totalStake) * poolReward;
        }

        const ERA_PER_DAY = 4;
        const expectedDailyRoi = (sum * ERA_PER_DAY).toFixed(3);

        const total = temp.reduce((acc, curr) => {
          return acc + curr.staked;
        }, 0);
        const highest = Math.max(...temp.map(validator => validator.staked));
        const other = total - highest;
        final.push({
          nominatorId: nom.who,
          validators: temp,
          totalStaked: parseFloat(total.toFixed(3)),
          highestStaked: parseFloat(highest.toFixed(3)),
          othersStaked: parseFloat(other.toFixed(3)),
          expectedDailyRoi: parseFloat(expectedDailyRoi)
        });
        temp = [];
      }
    });
    res.json(final.length);
  } catch (err) {
    console.log('err', err);
  }
});

//To keep heroku dyno awake
setInterval(function() {
  https.get('https://evening-sea-52088.herokuapp.com/');
}, 300000 * 5); // every 5 minutes (300000)

const PORT = process.env.PORT || 3006;
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
