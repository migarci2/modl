// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {IEigenOracle} from "../../src/modules/eigen/EigenOracleModule.sol";

contract MockEigenOracle is IEigenOracle {
    uint256 public value;
    uint256 public updatedAt;

    function setValue(uint256 value_, uint256 updatedAt_) external {
        value = value_;
        updatedAt = updatedAt_;
    }

    function latest() external view returns (uint256, uint256) {
        return (value, updatedAt);
    }
}
