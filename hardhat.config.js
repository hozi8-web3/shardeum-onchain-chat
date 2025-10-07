require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: ".env.local" });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  networks: {
    shardeum: {
      url: "https://api-mezame.shardeum.org",
      chainId: 8119,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto",
      gas: "auto",
    },
    hardhat: {
      chainId: 1337,
    },
  },
  etherscan: {
    apiKey: {
      shardeum: "not-needed",
    },
    customChains: [
      {
        network: "shardeum",
        chainId: 8119,
        urls: {
          apiURL: "https://explorer-mezame.shardeum.org/api",
          browserURL: "https://explorer-mezame.shardeum.org",
        },
      },
    ],
  },
};
