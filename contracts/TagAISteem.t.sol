// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {TagAISteem} from "./TagAISteem.sol";
import {Test} from "forge-std/Test.sol";

contract TagAISteemTest is Test {
    TagAISteem tagAISteem;
    address owner;
    address minter;
    address user1;
    address user2;

    // 事件声明，用于验证事件
    event SteemToTagAISteem(string steemAccount, address user, uint256 amount);
    event TagAISteemToSteem(string steemAccount, address user, uint256 amount);

    function setUp() public {
        // 创建测试账户
        owner = address(this); // 测试合约作为 owner
        minter = makeAddr("minter");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        // 部署合约
        tagAISteem = new TagAISteem(minter);
    }

    // 测试初始化
    function test_InitialState() public view {
        assertEq(tagAISteem.minter(), minter, "Minter should be set correctly");
        assertEq(tagAISteem.name(), "TagAISteem", "Token name should be TagAISteem");
        assertEq(tagAISteem.symbol(), "TAGAISTEEM", "Token symbol should be TAGAISTEEM");
        assertEq(tagAISteem.totalSupply(), 0, "Initial total supply should be 0");
    }

    // 测试 steemToTsteem - 只有 minter 可以调用
    function test_SteemToTsteem_Success() public {
        uint256 amount = 1000e18;
        string memory steemAccount = "testuser";

        // minter 调用铸造代币
        vm.prank(minter);
        vm.expectEmit(true, true, false, true);
        emit SteemToTagAISteem(steemAccount, user1, amount);
        tagAISteem.steemToTsteem(steemAccount, user1, amount);

        // 验证代币余额
        assertEq(tagAISteem.balanceOf(user1), amount, "User1 should receive the tokens");
        assertEq(tagAISteem.totalSupply(), amount, "Total supply should increase");
    }

    // 测试 steemToTsteem - 非 minter 调用应该失败
    function test_SteemToTsteem_OnlyMinter() public {
        uint256 amount = 1000e18;
        string memory steemAccount = "testuser";

        // 非 minter 调用应该失败
        vm.prank(user1);
        vm.expectRevert("Only minter can call this function");
        tagAISteem.steemToTsteem(steemAccount, user1, amount);
    }

    // 测试 steemToTsteem - 铸造给多个用户
    function test_SteemToTsteem_MultipleUsers() public {
        uint256 amount1 = 1000e18;
        uint256 amount2 = 2000e18;

        vm.prank(minter);
        tagAISteem.steemToTsteem("user1", user1, amount1);

        vm.prank(minter);
        tagAISteem.steemToTsteem("user2", user2, amount2);

        assertEq(tagAISteem.balanceOf(user1), amount1, "User1 balance should be correct");
        assertEq(tagAISteem.balanceOf(user2), amount2, "User2 balance should be correct");
        assertEq(tagAISteem.totalSupply(), amount1 + amount2, "Total supply should be sum of both");
    }

    // 测试 tsteemToSteem - 用户燃烧代币
    function test_TsteemToSteem_Success() public {
        uint256 mintAmount = 1000e18;
        uint256 burnAmount = 500e18;
        string memory steemAccount = "testuser";

        // 先给用户铸造代币
        vm.prank(minter);
        tagAISteem.steemToTsteem("mintaccount", user1, mintAmount);

        // 用户燃烧代币
        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit TagAISteemToSteem(steemAccount, user1, burnAmount);
        tagAISteem.tsteemToSteem(steemAccount, burnAmount);

        // 验证余额和总供应量
        assertEq(tagAISteem.balanceOf(user1), mintAmount - burnAmount, "User1 balance should decrease");
        assertEq(tagAISteem.totalSupply(), mintAmount - burnAmount, "Total supply should decrease");
    }

    // 测试 tsteemToSteem - 余额不足应该失败
    function test_TsteemToSteem_InsufficientBalance() public {
        uint256 mintAmount = 1000e18;
        uint256 burnAmount = 2000e18; // 超过余额

        // 先给用户铸造代币
        vm.prank(minter);
        tagAISteem.steemToTsteem("mintaccount", user1, mintAmount);

        // 尝试燃烧超过余额的代币
        vm.prank(user1);
        vm.expectRevert(); // ERC20 的 _burn 会抛出错误
        tagAISteem.tsteemToSteem("testuser", burnAmount);
    }

    // 测试 tsteemToSteem - 燃烧全部代币
    function test_TsteemToSteem_BurnAll() public {
        uint256 amount = 1000e18;

        // 先给用户铸造代币
        vm.prank(minter);
        tagAISteem.steemToTsteem("mintaccount", user1, amount);

        // 用户燃烧全部代币
        vm.prank(user1);
        tagAISteem.tsteemToSteem("testuser", amount);

        assertEq(tagAISteem.balanceOf(user1), 0, "User1 balance should be 0");
        assertEq(tagAISteem.totalSupply(), 0, "Total supply should be 0");
    }

    // 测试 setMinter - 只有 owner 可以调用
    function test_SetMinter_Success() public {
        address newMinter = makeAddr("newMinter");

        // owner 调用设置新的 minter
        tagAISteem.setMinter(newMinter);

        assertEq(tagAISteem.minter(), newMinter, "Minter should be updated");
    }

    // 测试 setMinter - 非 owner 调用应该失败
    function test_SetMinter_OnlyOwner() public {
        address newMinter = makeAddr("newMinter");

        // 非 owner 调用应该失败
        vm.prank(user1);
        vm.expectRevert();
        tagAISteem.setMinter(newMinter);
    }

    // 测试完整的流程：铸造 -> 转移 -> 燃烧
    function test_FullFlow() public {
        uint256 mintAmount = 1000e18;
        uint256 transferAmount = 300e18;
        uint256 burnAmount = 200e18;

        // 1. minter 给 user1 铸造代币
        vm.prank(minter);
        tagAISteem.steemToTsteem("user1", user1, mintAmount);
        assertEq(tagAISteem.balanceOf(user1), mintAmount, "User1 should receive tokens");

        // 2. user1 转移部分代币给 user2
        vm.prank(user1);
        tagAISteem.transfer(user2, transferAmount);
        assertEq(tagAISteem.balanceOf(user1), mintAmount - transferAmount, "User1 balance should decrease");
        assertEq(tagAISteem.balanceOf(user2), transferAmount, "User2 should receive tokens");

        // 3. user2 燃烧部分代币
        vm.prank(user2);
        tagAISteem.tsteemToSteem("user2", burnAmount);
        assertEq(tagAISteem.balanceOf(user2), transferAmount - burnAmount, "User2 balance should decrease");
        assertEq(tagAISteem.totalSupply(), mintAmount - burnAmount, "Total supply should be correct");
    }

    // 测试零金额铸造
    function test_SteemToTsteem_ZeroAmount() public {
        vm.prank(minter);
        tagAISteem.steemToTsteem("testuser", user1, 0);

        assertEq(tagAISteem.balanceOf(user1), 0, "User1 balance should be 0");
        assertEq(tagAISteem.totalSupply(), 0, "Total supply should remain 0");
    }

    // 测试零金额燃烧
    function test_TsteemToSteem_ZeroAmount() public {
        uint256 mintAmount = 1000e18;

        // 先给用户铸造代币
        vm.prank(minter);
        tagAISteem.steemToTsteem("mintaccount", user1, mintAmount);

        // 燃烧零金额（应该成功但不改变余额）
        vm.prank(user1);
        tagAISteem.tsteemToSteem("testuser", 0);

        assertEq(tagAISteem.balanceOf(user1), mintAmount, "User1 balance should remain unchanged");
        assertEq(tagAISteem.totalSupply(), mintAmount, "Total supply should remain unchanged");
    }
}
