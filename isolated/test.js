const { ApiPromise, WsProvider } = require("@polkadot/api");
const createApi = async () => {
	const wsProvider = new WsProvider("wss://kusama-rpc.polkadot.io");
	const api = await ApiPromise.create({
		provider: wsProvider
	});
    await api.isReady;
    const logger = await api.derive.staking.stakerRewards(
			`FPstA2NF8wH4d8Z3VWhmALLSpcMi8Tttsv8jsJNZvL1y7GA`,
			581
        );
    console.log(logger)
};
createApi();
