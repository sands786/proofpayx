require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.19",
  networks: {
    xlayer_testnet: {
      url: "https://testrpc.xlayer.tech",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 1952,
    },
    xlayer_mainnet: {
      url: "https://rpc.xlayer.tech",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 196,
    }
  }
};
