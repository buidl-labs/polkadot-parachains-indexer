const { ApiPromise, WsProvider } = require('@polkadot/api');
const { hexToString } = require('@polkadot/util');
const _ = require('lodash');

const createApi = async () => {
  // console.log(`Connecting to API...`);
  let electedInfo;
  const wsProvider = new WsProvider('wss://kusama-rpc.polkadot.io');
  const api = await ApiPromise.create({ provider: wsProvider });
  await api.isReady;
  // console.log(`API is ready`);
  // console.clear();
  // Fetch recent reward events from Polkascan
  const res = await fetch(
    'https://polkascan.io/kusama-cc3/api/v1/event?&filter[module_id]=staking&filter[event_id]=Reward&page[size]=10'
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
          let name = `Validator (...${address.toString().slice(-6)})`;
          const commission = await api.query.staking.validators(address);
          try {
            const identity = await api.query.identity.identityOf(address);
            const identityJSON = identity.toJSON();
            if (identityJSON !== null) {
              name = hexToString(identityJSON.info.display.Raw);
            }
          } catch (e) {
            console.error(e);
          }
          // const name = await api.query.nicks.nameOf(`${address.toString()}`);
          result[address] = {
            stashId: address.toString(),
            stashIdTruncated: `${address
              .toString()
              .slice(0, 4)}...${address.toString().slice(-6)}`,
            points: [],
            poolReward: '',
            totalStake: '',
            commission: commission[0].commission.toNumber() / 10 ** 7,
            name: name
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

  electedInfo = await api.derive.staking.electedInfo();

  const validatorData = await Promise.all(
    Object.keys(result).map(async (key, index) => {
      const validatorPoolReward =
        ((result[key].points.reduce((acc, curr) => acc + curr, 0) /
          result[key].points.length) *
          reward) /
        10 ** 12;
      const stakeInfo = await api.derive.staking.account(key.toString());
      const parsedStakeInfo = JSON.parse(JSON.stringify(stakeInfo));
      const totalStake =
        Object.keys(parsedStakeInfo).length > 0 &&
        parsedStakeInfo.constructor === Object
          ? parsedStakeInfo.stakers.total.toString() / 10 ** 12
          : undefined;
      result[key].totalStake = totalStake;
      result[key].noOfNominators = parsedStakeInfo.stakers.others.length;
      result[key].poolRewardWithCommission = isNaN(validatorPoolReward) ? 'Not enough data' : validatorPoolReward;
      result[key].poolReward = isNaN(validatorPoolReward)
        ? 'Not enough data'
        : (1 - result[key].commission / 100) * validatorPoolReward;
      //   setElectedInfo(electedInfo);
      return result[key];
    })
  );
  const filteredValidatorData = validatorData.filter(curr =>
    currentValidators.includes(curr.stashId)
  );

  const filteredValidatorInfos = filteredValidatorData.map(validator => {
    const temp = JSON.parse(JSON.stringify(electedInfo)).info.find(
      currentValidator => {
        if (currentValidator.stashId === validator.stashId) {
          return true;
        }
      }
    );
    // console.log('electedInfo value', temp);
    return {
      currentValidator: temp,
      stashId: validator.stashId,
      stashIdTruncated: validator.stashIdTruncated,
      points: validator.points,
      poolReward: validator.poolReward,
      totalStake: validator.totalStake,
      commission: validator.commission,
      name: validator.name,
      noOfNominators: validator.noOfNominators,
      poolRewardWithCommission: validator.poolRewardWithCommission,
    };
  });

  //calculation of nominators data -- Start
  //TODO: fix multiple nominators with same id issue, i.e avoid redundance
  //eg nominator id: GRTHCT1fNRgbqMURtEDuZPBbQ7tHcgt3swzdmGNk1MKchqL
  const parsedElectedInfo = JSON.parse(JSON.stringify(electedInfo));
  //Store all the validators and electedInfo data
  const newData = filteredValidatorData.map(validator => {
    const temp = parsedElectedInfo.info.find(currentValidator => {
      if (currentValidator.stashId === validator.stashId) {
        return true;
      }
    });
    return {
      electedInfo: temp,
      validator: validator
    };
  });

  //Store all the unique nominators
  const nominators = [];
  newData.forEach(data => {
    data.electedInfo.stakers.others.forEach(nom => {
      const tempObj = { who: nom.who, value: nom.value };
      if (!_.some(nominators, tempObj)) {
        nominators.push(tempObj);
      }
    });
  });

  //Store all the validators, electedInfo data to nominator
  const finalNominatorsList = [];
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
      const expectedDailyRoi = (sum * ERA_PER_DAY).toFixed(3) ? (sum * ERA_PER_DAY).toFixed(3) : 0;

      const total = temp.reduce((acc, curr) => {
        return acc + curr.staked;
      }, 0);
      const highest = Math.max(...temp.map(validator => validator.staked));
      const other = total - highest;
      finalNominatorsList.push({
        nominatorId: nom.who,
        validators: temp,
        totalStaked: parseFloat(total.toFixed(3)),
        highestStaked: parseFloat(highest.toFixed(3)),
        othersStaked: parseFloat(other.toFixed(3)),
        expectedDailyRoi: parseFloat(expectedDailyRoi),
        backers: temp.length
      });
      temp = [];
    }
  });

  //calculation of nominators data -- End

  // setApiConnected(true);
  // setValidatorData(filteredValidatorData);
  // setIntentionData(intentions);
  // setValidatorsAndIntentions(validatorsAndIntentions);
  return {
    filteredValidatorData,
    intentions,
    validatorsAndIntentions,
    electedInfo,
    finalNominatorsList,
    filteredValidatorInfos
  };
};
module.exports = createApi;
