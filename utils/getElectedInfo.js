const { ApiPromise, WsProvider } = require("@polkadot/api");
const EI = require("../models/ElectedInfo");
async function getElectedInfo(){
    const wsProvider = new WsProvider("wss://kusama-rpc.polkadot.io");
    const api = await ApiPromise.create({ provider: wsProvider });
    await api.isReady;
    const electedInfo = await api.derive.staking.electedInfo();
    const stringify = JSON.stringify(electedInfo);
    const parsed = JSON.parse(stringify);
    // console.log(parsed);
    const newElectedInfo = new EI(parsed);
    const result = await newElectedInfo.save();
    return result;
}

module.exports = getElectedInfo;