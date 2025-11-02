import type { HardhatUserConfig } from "hardhat/config";

import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import hardhatVerifyPlugin from "@nomicfoundation/hardhat-verify";
import { configVariable } from "hardhat/config";

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxViemPlugin, hardhatVerifyPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  chainDescriptors: {
    56: {
      name: "BSC",
      blockExplorers: {
        etherscan: {
          name: "bscscan",
          url: "https://bscscan.com",
          // BscScan API V2 端点（V1 已弃用）
          apiUrl: "https://api.etherscan.io/v2/api",
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
    // BSC 主网
    bsc: {
      type: "http",
      chainType: "l1",
      url: configVariable("BSC_MAIN_RPC_URL"),
      accounts: [configVariable("BSC_MAIN_PRIVAT_KEY")],
      chainId: 56
    },
  },
  // 合约验证配置
  verify: {
    etherscan: {
      // BSC 主网使用 BscScan API
      // API Key 通过环境变量 BSCSCAN_API_KEY 设置
      apiKey: configVariable("BSC_API_KEY"),
    },
  },
};

export default config;
