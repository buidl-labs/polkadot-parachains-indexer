const { ApiPromise, WsProvider } = require("@polkadot/api");
const Intention = require("../models/Intention");
async function validatorsAndIntentions(){
    const wsProvider = new WsProvider("wss://kusama-rpc.polkadot.io");
    const api = await ApiPromise.create({ provider: wsProvider });
    await api.isReady;
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

    const result = await new Intention({
        intentions: intentions,
        validatorsAndIntentions: validatorsAndIntentions
    })
    const savedResult = await result.save();
    return savedResult;
}

module.exports = validatorsAndIntentions;