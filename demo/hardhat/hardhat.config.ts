import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import * as dotenv from "dotenv";

dotenv.config();

const rpcUrl = process.env.RPC_URL || "";
const privateKey = process.env.PRIVATE_KEY;

const config: HardhatUserConfig = {
  solidity: "0.8.26",
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    sepolia: {
      url: rpcUrl,
      accounts: privateKey ? [privateKey] : [],
    },
    mainnet: {
      url: rpcUrl,
      accounts: privateKey ? [privateKey] : [],
    },
  },
};

export default config;
