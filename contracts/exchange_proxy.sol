// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.15;

import './exchange_storage.sol';
//import "@openzeppelin/contracts/proxy/Proxy.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "hardhat/console.sol";


contract ExchangeProxy is ExchangeStorage, TransparentUpgradeableProxy {
    constructor(address _imp, ERC20 _usdc) TransparentUpgradeableProxy(_imp, msg.sender, bytes('')) {
        usdc = _usdc;
        console.log("proxy usdc %s", address(usdc));
        usdcDecimals = usdc.decimals();
        swapEnabled = true;
    }

    receive() external payable { }
}