// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IEigenOracle {
    function latest() external view returns (uint256 value, uint256 updatedAt);
}

/**
 * @title EigenOracleModule
 * @notice Lightweight helper to consume EigenLayer-backed oracles with freshness checks.
 */
abstract contract EigenOracleModule is Ownable {
    IEigenOracle public eigenOracle;
    uint256 public maxStaleness;

    error EigenOracleStale(uint256 updatedAt, uint256 now_, uint256 maxStaleness);
    error InvalidOracle(address oracle);

    event EigenOracleUpdated(address indexed oracle, uint256 maxStaleness);
    event EigenOracleStalenessUpdated(uint256 maxStaleness);

    constructor(address oracle, uint256 maxStalenessSeconds) Ownable(msg.sender) {
        if (oracle == address(0)) revert InvalidOracle(address(0));
        eigenOracle = IEigenOracle(oracle);
        maxStaleness = maxStalenessSeconds;
        emit EigenOracleUpdated(oracle, maxStalenessSeconds);
    }

    function setEigenOracle(address oracle) public virtual onlyOwner {
        if (oracle == address(0)) revert InvalidOracle(address(0));
        eigenOracle = IEigenOracle(oracle);
        emit EigenOracleUpdated(oracle, maxStaleness);
    }

    function setMaxStaleness(uint256 maxStalenessSeconds) public virtual onlyOwner {
        maxStaleness = maxStalenessSeconds;
        emit EigenOracleStalenessUpdated(maxStalenessSeconds);
    }

    /**
     * @notice Fetch a fresh oracle value, reverting if the feed is stale.
     */
    function _getFreshValue() internal view returns (uint256 value) {
        uint256 updatedAt;
        (value, updatedAt) = eigenOracle.latest();
        if (maxStaleness > 0 && block.timestamp - updatedAt > maxStaleness) {
            revert EigenOracleStale(updatedAt, block.timestamp, maxStaleness);
        }
    }
}
