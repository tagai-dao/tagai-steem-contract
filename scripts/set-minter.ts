import { network } from "hardhat";
import { encodeFunctionData } from "viem";

/**
 * 设置 TagAISteem 合约的 minter 地址
 * 
 * 使用方法:
 * npx hardhat run scripts/set-minter.ts --network bsc
 * 
 * 需要配置环境变量或通过 keystore 设置:
 * - BSC_MAIN_PRIVAT_KEY: BSC 主网私钥（必须是合约的 owner）
 * - BSC_MAIN_RPC_URL: BSC 主网 RPC URL
 * 
 * 注意：只有合约的 owner 可以设置 minter 地址
 */

// 已部署的合约地址
const CONTRACT_ADDRESS = "0x61221d38e626CDb8B27F755A9e0019d5aAae81EA";

// 新的 minter 地址（在这里修改为你想要设置的地址）
// 示例: "0x1234567890123456789012345678901234567890"
const NEW_MINTER_ADDRESS = "0x0000001570BD7753dFCb42E1AD2E33D86eBA8870" as `0x${string}`;

async function main() {
  // 连接到指定网络（通过 --network 参数指定，如 bsc）
  const { viem } = await network.connect();

  const publicClient = await viem.getPublicClient();
  const [walletClient] = await viem.getWalletClients();

  console.log("=== 设置 TagAISteem 合约的 Minter 地址 ===\n");
  console.log("网络:", network);
  console.log("合约地址:", CONTRACT_ADDRESS);
  console.log("当前账户:", walletClient.account.address);
  console.log("新 minter 地址:", NEW_MINTER_ADDRESS);
  console.log();

  // 验证新地址格式
  if (!NEW_MINTER_ADDRESS || NEW_MINTER_ADDRESS !== "0x0000001570BD7753dFCb42E1AD2E33D86eBA8870") {
    throw new Error("请先在脚本中设置正确的 NEW_MINTER_ADDRESS");
  }

  // 获取合约实例（通过合约名称自动获取 ABI）
  const contract = await viem.getContractAt(
    "TagAISteem",
    CONTRACT_ADDRESS
  );

  // 检查当前账户是否为 owner
  const owner = await contract.read.owner();
  if (owner.toLowerCase() !== walletClient.account.address.toLowerCase()) {
    throw new Error(
      `当前账户 ${walletClient.account.address} 不是合约的 owner。Owner 地址: ${owner}`
    );
  }

  console.log("✓ 验证通过：当前账户是合约 owner");

  // 检查当前 minter 地址
  const currentMinter = await contract.read.minter();
  console.log("当前 minter 地址:", currentMinter);
  console.log();

  // 如果新地址和当前地址相同，提示并退出
  if (currentMinter.toLowerCase() === NEW_MINTER_ADDRESS.toLowerCase()) {
    console.log("⚠️  新 minter 地址与当前地址相同，无需更新");
    return;
  }

  // 估算 gas
  console.log("正在估算 gas...");
  const data = encodeFunctionData({
    abi: contract.abi,
    functionName: "setMinter",
    args: [NEW_MINTER_ADDRESS as `0x${string}`],
  });
  const gasEstimate = await publicClient.estimateGas({
    account: walletClient.account.address,
    to: CONTRACT_ADDRESS,
    data,
  });

  console.log("估算 gas:", gasEstimate.toString());
  console.log();
  
  // 执行交易
  console.log("正在发送交易设置新的 minter 地址...");
  const hash = await contract.write.setMinter([NEW_MINTER_ADDRESS as `0x${string}`]);

  console.log("交易哈希:", hash);
  console.log("等待交易确认...");

  // 等待交易确认
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("✓ 交易已确认");
  console.log("区块号:", receipt.blockNumber);
  console.log("Gas 使用量:", receipt.gasUsed.toString());
  console.log();

  // 验证新的 minter 地址
  const newMinter = await contract.read.minter();
  if (newMinter.toLowerCase() === NEW_MINTER_ADDRESS.toLowerCase()) {
    console.log("✅ 成功！新的 minter 地址已设置:", newMinter);
  } else {
    console.log("⚠️  警告：minter 地址设置可能未生效");
    console.log("期望:", NEW_MINTER_ADDRESS);
    console.log("实际:", newMinter);
  }
}

// 执行主函数
main()
  .then(() => {
    console.log("\n脚本执行完成");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ 错误:", error);
    process.exit(1);
  });
