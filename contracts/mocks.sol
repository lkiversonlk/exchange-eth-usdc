// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.15;
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    constructor(string memory name, string memory symbol, uint256 amount) ERC20(name, symbol) {
        _mint(msg.sender, amount);
    }
}

contract MockPriceFeed {
    int public price = 1 ether;
    function setPrice(int _price) external {
        price = _price;
    }

    function latestRoundData()
    external
    view
    returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    ) {
        return (0, price, 0, 0, 0);
    }

    function decimals() external pure returns (uint8) {
        return 18;
    }
}