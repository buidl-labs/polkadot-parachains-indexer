const { ApiPromise } = require("@polkadot/api");
const riskScoreCalculator = async (validatorsData, provider) => {
  // const wsProvider = new WsProvider("wss://kusama-rpc.polkadot.io");
  const api = await ApiPromise.create({ provider });
  await api.isReady;

  // const accountsDetails = await fetch(
  //     `https://polka-analytic-api.herokuapp.com/validatorinfo`
  // );
  // const accountsDetailsJSON = await accountsDetails.json();
  // // console.log(JSON.stringify(accountsDetailsJSON))
  // console.log(JSON.stringify(validatorsData))
  let noOfNominatorsArr = [];
  let ownStakeArr = [];
  let otherStakeArr = [];
  const accountsDetailsJSON = Object.values(validatorsData);
  accountsDetailsJSON.forEach((element) => {
    element.activeEras = element.eraPoints.length;
    ownStakeArr.push(element.info.exposure.own);
    noOfNominatorsArr.push(element.noOfNominators);
    otherStakeArr.push(
      element.info.exposure.others.reduce((a, b) => a + parseInt(b.value), 0)
    );
  });
  const maxNom = Math.max(...noOfNominatorsArr);
  const maxOwnS = Math.max(...ownStakeArr);
  const minNom = Math.min(...noOfNominatorsArr);
  const minOwnS = Math.min(...ownStakeArr);
  const maxOthS = Math.max(...otherStakeArr);
  // console.log(maxOthS)
  const minOthS = Math.min(...otherStakeArr);
  // console.log(minOthS)
  let slashesInfo = {};
  console.log("++++getting slash info+++++");
  const slashRawData = await Promise.all(
    accountsDetailsJSON.map((element) =>
      api.derive.staking.ownSlashes(element.stashId.toString())
    )
  );
  console.log("get raw data");
  slashRawData.map((data, index) => {
    slashesInfo[accountsDetailsJSON[index].stashId.toString()] = {
      slashInfo: data,
      slashCount: data.reduce((acc, slash) => acc + slash.total.toNumber(), 0),
    };
  });
//   console.log("structed raw data");

//   console.log(JSON.stringify(slashesInfo));

  // scaling data between 1 = a and 100 = b
  let riskScoreArr = [];
  function scaleData(val, max, min) {
    return ((val - min) / (max - min)) * (100 - 1) + 1;
  }
  function normalizeData(val, max, min) {
    return (val - min) / (max - min);
  }
  console.log("+++++restructuring data+++++");
  accountsDetailsJSON.forEach((element) => {
    const otherStake = element.info.exposure.others.reduce(
      (a, b) => a + parseInt(b.value),
      0
    );
    // console.log(otherStake)
    const slashScore =
      (1 + slashesInfo[element.stashId].slashCount) / element.activeEras;
    const backersScore = 1 / scaleData(element.noOfNominators, maxNom, minNom);
    const validatorOwnRisk =
      1 / scaleData(element.info.exposure.own, maxOwnS, minOwnS);
    const riskScore =
      slashScore +
      backersScore +
      validatorOwnRisk +
      1 / scaleData(otherStake, maxOthS, minOthS);
    riskScoreArr.push({
      riskScore: riskScore,
      stashId: element.stashId,
      slashCount: slashesInfo[element.stashId].slashCount,
    });
    // console.log('stashId: ' + element.stashId.toString() + ' slashScore: ' + slashScore.toFixed(3) + ' backersScore: ' + backersScore.toFixed(3) + ' ownStake: ' + validatorOwnRisk +' otherStake: '+  (1 / scaleData(otherStake, maxOthS, minOthS)).toFixed(3) + ' riskScore: ' + riskScore.toFixed(3) )
  });
  const maxRS = Math.max(...riskScoreArr.map((x) => x.riskScore));
  const minRS = Math.min(...riskScoreArr.map((x) => x.riskScore));
  riskScoreArr.forEach((x) => {
    // console.log('stashId: ' + x.stashId + ' normalizedRS: ' + normalizeData(x.riskScore, maxRS, minRS)  )
    x.riskScore = normalizeData(x.riskScore, maxRS, minRS);
  });
  console.log("riskscore completed");
  return riskScoreArr;
};

module.exports = riskScoreCalculator;
