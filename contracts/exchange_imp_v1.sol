// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.15;

import './exchange_storage.sol';
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "hardhat/console.sol";

contract ExchangeImpl is ExchangeStorage {

    function setPriceFeed(AggregatorV3Interface _feed) external onlyOwner {
        (,int price,,,) = _feed.latestRoundData();
        require(price > 0, 'price 0');   //price of USDC/ETH, 

        uint8 feedDecimals = _feed.decimals();
        require(feedDecimals > 0, 'decimals');
        priceFeed = _feed;
    }

    //owner can transfer usdc to exchange and call syncUSDC()
    function syncUSDC() external onlyOwner {
        //we may add a check that balanceOf must be larger than usdcCount
        console.log("%s", address(usdc));
        usdcCount = usdc.balanceOf(address(this));
    }

    function setSwapEnabled(bool _new) external onlyOwner {
        swapEnabled = _new;
    }
    
    //owner can approve and call depositUSDC()
    function depositUSDC(uint256 amount) external {
        usdc.transferFrom(msg.sender, address(this), amount);
        usdcCount = usdc.balanceOf(address(this));
    }

    //for user to deposit eth and swap usdc
    //deposit eth, if swapAmount > 0, swap eth to usdc using real time price
    //return the amount of swapped usdc
    function depositEthAndSwapForUSDC(uint256 swapAmount) external payable returns (uint256) {
        address dealer = msg.sender;
        {
            uint deposit = msg.value;
            ethCounts[dealer] += deposit;
            ethCount += deposit;
        }
        

        if (swapAmount == 0) {
            return 0;
        }

        require(swapEnabled, "swap disabled");
        require(swapAmount <= ethCounts[dealer], 'more eth');
        require(address(priceFeed) != address(0), 'feed 0');

        ethCounts[dealer] -= swapAmount;
        ethCount -= swapAmount;

        (,int price,,,) = priceFeed.latestRoundData();
        require(price > 0, 'price 0');   //price of USDC/ETH, 

        uint8 feedDecimals = priceFeed.decimals();

        //swapped = eth amount / price * price_decimal / eth_decimal * usdc_decimals
        uint256 swapped = swapAmount * (10 ** feedDecimals) * (10 ** usdcDecimals);
        swapped = swapped / uint(price) / (10 ** 18);

        require(swapped > 0, 'get zero');
        require(swapped <= usdcCount, 'usdc not enough');
        usdc.transfer(dealer, swapped);

        {
            uint usdcCount2 = usdc.balanceOf(address(this));
            //we record every usdc out, so usdcCount2 should equal to usdcCount - swapped
            //in case some unexpected usdc send to contract, so >=
            require(usdcCount2 >= usdcCount - swapped, "usdc count");
            usdcCount = usdcCount2;
        }   
        
        return swapped;
    }

    //for regular user to get ther eth back
    function withdrawEth(uint256 amount) external {
        address dealer = msg.sender;
        ethCounts[dealer] -= amount;
        ethCount -= amount;
        payable(dealer).transfer(amount);
    }

    //system owner withdraw eth
    function getEth() external {
        uint balance = address(this).balance;
        uint get = balance - ethCount;
        payable(owner()).transfer(get);
    }

    function getUSDC(uint amount) external {
        usdc.transfer(owner(), amount);
        usdcCount = usdc.balanceOf(address(this));
    }
}