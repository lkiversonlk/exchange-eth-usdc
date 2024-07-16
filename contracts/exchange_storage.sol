// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.15;

import "@openzeppelin/contracts/access/Ownable.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ExchangeStorage is Ownable{

    AggregatorV3Interface internal priceFeed;
    ERC20 immutable public usdc;
    uint immutable public usdcDecimals;
    
    //the record usdc count that depsoit into the contract by owner
    //if some unexpected usdc received from others, the usdc.balanceOf(this) may >= usdcCount
    uint256 public usdcCount;

    //the total eth count belongs to users,
    //it may be less than this.balance
    //(this.balance - ethCount) is the eth belong to the contract
    uint256 public ethCount;

    bool public swapEnabled;

    //SUM(ethCounts) == ethCount
    mapping(address=>uint256) public ethCounts;

    constructor() Ownable(msg.sender) {

    }

    
}