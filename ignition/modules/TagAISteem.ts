import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * TagAISteem 部署模块
 * 
 * 这个模块用于部署 TagAISteem ERC20 代币合约
 * 需要指定一个 minter 地址，用于铸造代币
 * 
 * 使用方法:
 * npx hardhat ignition deploy ignition/modules/TagAISteem.ts --parameters '{"TagAISteemModule":{"minter":"0x..."}}'
 * 
 * 如果不指定 minter 参数，将使用部署者地址作为默认 minter
 */
export default buildModule("TagAISteemModule", (m) => {
  // 获取 minter 地址参数，如果没有提供则使用部署者地址作为默认值
  // 在实际部署时可以通过 --parameters 参数传入自定义 minter 地址
  const minter = m.getParameter("minter", '0x0000001570BD7753dFCb42E1AD2E33D86eBA8870');

  // 部署 TagAISteem 合约
  // 构造函数参数: _minter 地址
  const tagAISteem = m.contract("TagAISteem", [minter]);

  // 可选：如果需要，可以在部署后立即执行一些初始化操作
  // 例如：给某个地址铸造初始代币
  // const initialMintAmount = m.getParameter("initialMintAmount", 0n);
  // if (initialMintAmount > 0n) {
  //   const initialRecipient = m.getParameter("initialRecipient", m.getAccount(1));
  //   m.call(tagAISteem, "steemToTsteem", [
  //     "initial",
  //     initialRecipient,
  //     initialMintAmount,
  //   ], { id: "initialMint" });
  // }

  // 返回部署的合约实例，供后续使用
  return { tagAISteem };
});
