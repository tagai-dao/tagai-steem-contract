// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TagAISteem is Ownable, ERC20 {
    address public minter;
    event SteemToTagAISteem(string steemAccount, address user, uint256 amount);
    event TagAISteemToSteem(string steemAccount, address user, uint256 amount);
    
    constructor(address _minter) Ownable(msg.sender) ERC20("TagAISteem", "TAGAISTEEM") {
        minter = _minter;
    }

    modifier onlyMinter() {
        require(msg.sender == minter, "Only minter can call this function");
        _;
    }

    //steem to Tsteem
    function steemToTsteem(string memory steemAccount, address _to, uint256 _amount)
        public
        onlyMinter
    {
        _mint(_to, _amount);
        emit SteemToTagAISteem(steemAccount, _to, _amount);
    }

    //Tsteem to steem
    function tsteemToSteem(string memory steemAccount, uint256 _amount)
        public
    {
        _burn(msg.sender, _amount);
        emit TagAISteemToSteem(steemAccount, msg.sender, _amount);
    }

    //设置矿工
    function setMinter(address _minter) 
        public
        onlyOwner
    {
        minter = _minter;
    }
}

 