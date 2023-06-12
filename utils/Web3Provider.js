const Web3 = require("web3");
const web3Provider = new Web3.providers.HttpProvider(
  process.env.INFURA_PROJECT_ID
);
const web3 = new Web3(web3Provider);

module.exports = web3;
