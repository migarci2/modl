// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IMODLModule} from "@modl/core/src/interfaces/IMODLModule.sol";
import {EigenOracleModule} from "@modl/core/src/modules/eigen/EigenOracleModule.sol";
import {LPFeeLibrary} from "@uniswap/v4-core/src/libraries/LPFeeLibrary.sol";
import {BalanceDelta, BalanceDeltaLibrary} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {ModifyLiquidityParams, SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";

/// @title {{MODULE_NAME}}
/// @notice Example module that consumes an EigenLayer-backed oracle with freshness checks.
contract {{MODULE_NAME}} is IMODLModule, EigenOracleModule, Ownable {
    address public immutable AGGREGATOR;
    uint24 public baseFeeBps = 300;
    uint24 public capFeeBps = 1_000;
    uint24 public multiplier = 100; // scaling factor for oracle value

    error NotAggregator(address caller);
    error InvalidFeeBounds(uint24 min, uint24 max);

    modifier onlyAggregator() {
        if (msg.sender != AGGREGATOR) revert NotAggregator(msg.sender);
        _;
    }

    constructor(address aggregator_, address oracle, uint256 maxStalenessSeconds)
        EigenOracleModule(oracle, maxStalenessSeconds)
        Ownable(msg.sender)
    {
        if (aggregator_ == address(0)) revert NotAggregator(address(0));
        AGGREGATOR = aggregator_;
    }

    function moduleName() external pure returns (string memory) {
        return "{{MODULE_NAME}}";
    }

    function moduleVersion() external pure returns (string memory) {
        return "0.0.1";
    }

    function setFees(uint24 baseFee, uint24 capFee, uint24 multiplier_) external onlyOwner {
        if (baseFee > capFee) revert InvalidFeeBounds(baseFee, capFee);
        baseFeeBps = baseFee;
        capFeeBps = capFee;
        multiplier = multiplier_;
    }

    function beforeSwap(IPoolManager, address, PoolKey calldata, SwapParams calldata, bytes calldata)
        external
        onlyAggregator
        returns (IMODLModule.BeforeSwapResult memory)
    {
        uint256 index = _getFreshValue();
        uint256 candidate = baseFeeBps + (index * multiplier) / 10_000;
        if (candidate > capFeeBps) candidate = capFeeBps;
        uint24 fee = uint24(candidate) | LPFeeLibrary.OVERRIDE_FEE_FLAG;

        return IMODLModule.BeforeSwapResult({
            hasDelta: false,
            delta: BeforeSwapDelta.wrap(0),
            hasNewFee: true,
            newFee: fee
        });
    }

    function afterSwap(IPoolManager, address, PoolKey calldata, SwapParams calldata, BalanceDelta, bytes calldata)
        external
        onlyAggregator
        returns (IMODLModule.AfterSwapResult memory)
    {
        return IMODLModule.AfterSwapResult({hasDelta: false, delta: 0});
    }

    function beforeInitialize(IPoolManager, address, PoolKey calldata, uint160) external onlyAggregator {}

    function afterInitialize(IPoolManager, address, PoolKey calldata, uint160, int24) external onlyAggregator {}

    function beforeAddLiquidity(
        IPoolManager,
        address,
        PoolKey calldata,
        ModifyLiquidityParams calldata,
        bytes calldata
    ) external onlyAggregator {}

    function afterAddLiquidity(
        IPoolManager,
        address,
        PoolKey calldata,
        ModifyLiquidityParams calldata,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external onlyAggregator returns (IMODLModule.BalanceDeltaResult memory) {
        return IMODLModule.BalanceDeltaResult({hasDelta: false, delta: BalanceDeltaLibrary.ZERO_DELTA});
    }

    function beforeRemoveLiquidity(
        IPoolManager,
        address,
        PoolKey calldata,
        ModifyLiquidityParams calldata,
        bytes calldata
    ) external onlyAggregator {}

    function afterRemoveLiquidity(
        IPoolManager,
        address,
        PoolKey calldata,
        ModifyLiquidityParams calldata,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external onlyAggregator returns (IMODLModule.BalanceDeltaResult memory) {
        return IMODLModule.BalanceDeltaResult({hasDelta: false, delta: BalanceDeltaLibrary.ZERO_DELTA});
    }

    function beforeDonate(IPoolManager, address, PoolKey calldata, uint256, uint256, bytes calldata)
        external
        onlyAggregator
    {}

    function afterDonate(IPoolManager, address, PoolKey calldata, uint256, uint256, bytes calldata)
        external
        onlyAggregator
    {}
}
