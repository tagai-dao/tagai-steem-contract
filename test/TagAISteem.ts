import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";

describe("TagAISteem", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  // 获取测试账户
  const [owner, minter, user1, user2] = await viem.getWalletClients();
  const ownerAccount = owner.account.address;
  const minterAccount = minter.account.address;
  const user1Account = user1.account.address;
  const user2Account = user2.account.address;

  it("应该正确初始化合约", async function () {
    const tagAISteem = await viem.deployContract("TagAISteem", [minterAccount]);

    // 验证名称和符号
    assert.equal(await tagAISteem.read.name(), "TagAISteem");
    assert.equal(await tagAISteem.read.symbol(), "TAGAISTEEM");

    // 验证 minter
    assert.equal((await tagAISteem.read.minter()).toLowerCase(), minterAccount.toLowerCase());

    // 验证初始总供应量
    assert.equal(await tagAISteem.read.totalSupply(), 0n);
  });

  it("minter 应该能够铸造代币", async function () {
    const tagAISteem = await viem.deployContract("TagAISteem", [minterAccount]);
    const deploymentBlockNumber = await publicClient.getBlockNumber();

    const amount = 1000n * 10n ** 18n;
    const steemAccount = "testuser";

    // minter 铸造代币给 user1
    await tagAISteem.write.steemToTsteem(
      [steemAccount, user1Account, amount],
      { account: minterAccount }
    );

    // 验证余额
    assert.equal(
      await tagAISteem.read.balanceOf([user1Account]),
      amount,
      "User1 应该收到代币"
    );

    // 验证总供应量
    assert.equal(
      await tagAISteem.read.totalSupply(),
      amount,
      "总供应量应该增加"
    );

    // 验证事件
    const events = await publicClient.getContractEvents({
      address: tagAISteem.address,
      abi: tagAISteem.abi,
      eventName: "SteemToTagAISteem",
      fromBlock: deploymentBlockNumber,
      strict: true,
    });

    assert.equal(events.length, 1, "应该发出一个事件");
    assert.equal(events[0].args.steemAccount, steemAccount);
    assert.equal(events[0].args.user?.toLowerCase(), user1Account.toLowerCase());
    assert.equal(events[0].args.amount, amount);
  });

  it("非 minter 不应该能够铸造代币", async function () {
    const tagAISteem = await viem.deployContract("TagAISteem", [minterAccount]);

    const amount = 1000n * 10n ** 18n;
    const steemAccount = "testuser";

    // user1 尝试铸造代币（应该失败）
    await assert.rejects(
      async () => {
        await tagAISteem.write.steemToTsteem(
          [steemAccount, user1Account, amount],
          { account: user1Account }
        );
      },
      {
        message: /Only minter can call this function/,
      }
    );
  });

  it("用户应该能够燃烧自己的代币", async function () {
    const tagAISteem = await viem.deployContract("TagAISteem", [minterAccount]);
    const deploymentBlockNumber = await publicClient.getBlockNumber();

    const mintAmount = 1000n * 10n ** 18n;
    const burnAmount = 500n * 10n ** 18n;
    const steemAccount = "testuser";

    // 先给 user1 铸造代币
    await tagAISteem.write.steemToTsteem(
      ["mintaccount", user1Account, mintAmount],
      { account: minterAccount }
    );

    // user1 燃烧代币
    await tagAISteem.write.tsteemToSteem(
      [steemAccount, burnAmount],
      { account: user1Account }
    );

    // 验证余额
    assert.equal(
      await tagAISteem.read.balanceOf([user1Account]),
      mintAmount - burnAmount,
      "User1 余额应该减少"
    );

    // 验证总供应量
    assert.equal(
      await tagAISteem.read.totalSupply(),
      mintAmount - burnAmount,
      "总供应量应该减少"
    );

    // 验证事件
    const events = await publicClient.getContractEvents({
      address: tagAISteem.address,
      abi: tagAISteem.abi,
      eventName: "TagAISteemToSteem",
      fromBlock: deploymentBlockNumber,
      strict: true,
    });

    const burnEvents = events.filter(
      (e) => e.args.steemAccount === steemAccount
    );
    assert.equal(burnEvents.length, 1, "应该发出一个燃烧事件");
    assert.equal(
      burnEvents[0].args.user?.toLowerCase(),
      user1Account.toLowerCase()
    );
    assert.equal(burnEvents[0].args.amount, burnAmount);
  });

  it("用户不应该能够燃烧超过余额的代币", async function () {
    const tagAISteem = await viem.deployContract("TagAISteem", [minterAccount]);

    const mintAmount = 1000n * 10n ** 18n;
    const burnAmount = 2000n * 10n ** 18n; // 超过余额

    // 先给 user1 铸造代币
    await tagAISteem.write.steemToTsteem(
      ["mintaccount", user1Account, mintAmount],
      { account: minterAccount }
    );

    // user1 尝试燃烧超过余额的代币（应该失败）
    await assert.rejects(
      async () => {
        await tagAISteem.write.tsteemToSteem(
          ["testuser", burnAmount],
          { account: user1Account }
        );
      },
      {
        message: /ERC20InsufficientBalance|insufficient balance/i,
      }
    );
  });

  it("owner 应该能够设置新的 minter", async function () {
    const tagAISteem = await viem.deployContract("TagAISteem", [minterAccount]);

    const newMinter = user2Account;

    // owner 设置新的 minter
    await tagAISteem.write.setMinter([newMinter], {
      account: ownerAccount,
    });

    // 验证 minter 已更新
    assert.equal(
      (await tagAISteem.read.minter()).toLowerCase(),
      newMinter.toLowerCase(),
      "Minter 应该已更新"
    );

    // 新的 minter 应该能够铸造代币
    const amount = 1000n * 10n ** 18n;
    await tagAISteem.write.steemToTsteem(
      ["testuser", user1Account, amount],
      { account: newMinter }
    );

    assert.equal(
      await tagAISteem.read.balanceOf([user1Account]),
      amount,
      "新 minter 应该能够铸造代币"
    );
  });

  it("非 owner 不应该能够设置 minter", async function () {
    const tagAISteem = await viem.deployContract("TagAISteem", [minterAccount]);

    const newMinter = user2Account;

    // user1 尝试设置新的 minter（应该失败）
    await assert.rejects(
      async () => {
        await tagAISteem.write.setMinter([newMinter], {
          account: user1Account,
        });
      },
      {
        message: /OwnableUnauthorizedAccount|caller is not the owner/i,
      }
    );
  });

  it("应该支持完整的代币流程", async function () {
    const tagAISteem = await viem.deployContract("TagAISteem", [minterAccount]);

    const mintAmount = 1000n * 10n ** 18n;
    const transferAmount = 300n * 10n ** 18n;
    const burnAmount = 200n * 10n ** 18n;

    // 1. minter 给 user1 铸造代币
    await tagAISteem.write.steemToTsteem(
      ["user1", user1Account, mintAmount],
      { account: minterAccount }
    );

    // 2. user1 转移部分代币给 user2
    await tagAISteem.write.transfer([user2Account, transferAmount], {
      account: user1Account,
    });

    assert.equal(
      await tagAISteem.read.balanceOf([user1Account]),
      mintAmount - transferAmount,
      "User1 余额应该减少"
    );
    assert.equal(
      await tagAISteem.read.balanceOf([user2Account]),
      transferAmount,
      "User2 应该收到代币"
    );

    // 3. user2 燃烧部分代币
    await tagAISteem.write.tsteemToSteem(
      ["user2", burnAmount],
      { account: user2Account }
    );

    assert.equal(
      await tagAISteem.read.balanceOf([user2Account]),
      transferAmount - burnAmount,
      "User2 余额应该减少"
    );
    assert.equal(
      await tagAISteem.read.totalSupply(),
      mintAmount - burnAmount,
      "总供应量应该正确"
    );
  });

  it("应该支持铸造给多个用户", async function () {
    const tagAISteem = await viem.deployContract("TagAISteem", [minterAccount]);

    const amount1 = 1000n * 10n ** 18n;
    const amount2 = 2000n * 10n ** 18n;

    // 铸造给 user1
    await tagAISteem.write.steemToTsteem(
      ["user1", user1Account, amount1],
      { account: minterAccount }
    );

    // 铸造给 user2
    await tagAISteem.write.steemToTsteem(
      ["user2", user2Account, amount2],
      { account: minterAccount }
    );

    assert.equal(
      await tagAISteem.read.balanceOf([user1Account]),
      amount1,
      "User1 余额应该正确"
    );
    assert.equal(
      await tagAISteem.read.balanceOf([user2Account]),
      amount2,
      "User2 余额应该正确"
    );
    assert.equal(
      await tagAISteem.read.totalSupply(),
      amount1 + amount2,
      "总供应量应该是两者之和"
    );
  });
});
