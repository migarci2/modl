// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

contract DummyERC20 {
    string public name;
    string public symbol;
    uint8 public immutable DECIMALS;

    constructor(string memory name_, string memory symbol_, uint8 decimals_) {
        name = name_;
        symbol = symbol_;
        DECIMALS = decimals_;
    }

    function decimals() external view returns (uint8) {
        return DECIMALS;
    }
}
