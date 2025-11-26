// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {EigenOracleModule} from "./EigenOracleModule.sol";
import {IMODLModule} from "../../interfaces/IMODLModule.sol";
import {LPFeeLibrary} from "@uniswap/v4-core/src/libraries/LPFeeLibrary.sol";
import {BalanceDelta, BalanceDeltaLibrary} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {ModifyLiquidityParams, SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";

/**
 * @title EigenDynamicFeeModule
 * @notice Dynamic-fee calculator that pulls a volatility index from an EigenLayer oracle.
 */
contract EigenDynamicFeeModule is IMODLModule, EigenOracleModule {
    uint256 private constant MULTIPLIER_DENOMINATOR = 1e4;

    address public immutable AGGREGATOR;

    uint24 public minFee;
    uint24 public maxFee;
    uint24 public baseFee;
    uint24 public volatilityMultiplier;

    error NotAggregator(address caller);
    error InvalidFeeBounds(uint24 minFee, uint24 maxFee);

    event FeeBoundsUpdated(uint24 minFee, uint24 maxFee, uint24 baseFee);
    event VolatilityConfigUpdated(uint24 multiplier, uint256 maxStaleness);

    struct SwapFeeInstruction {
        bool useCustomFee;
        uint24 customFee;
    }

    modifier onlyAggregator() {
        if (msg.sender != AGGREGATOR) revert NotAggregator(msg.sender);
        _;
    }

    constructor(
        address aggregator_,
        address oracle,
        uint256 maxStalenessSeconds,
        uint24 minFee_,
        uint24 maxFee_,
        uint24 baseFee_,
        uint24 volatilityMultiplier_
    ) EigenOracleModule(oracle, maxStalenessSeconds) {
        if (aggregator_ == address(0)) revert NotAggregator(address(0));
        AGGREGATOR = aggregator_;
        _setFeeBounds(minFee_, maxFee_, baseFee_);
        volatilityMultiplier = volatilityMultiplier_;
    }

    function moduleName() external pure returns (string memory) {
        return "EigenDynamicFee";
    }

    function moduleVersion() external pure returns (string memory) {
        return "1.0.0";
    }

    function configureFeeWindow(uint24 minFee_, uint24 maxFee_, uint24 baseFee_) external onlyOwner {
        _setFeeBounds(minFee_, maxFee_, baseFee_);
    }

    function setVolatilityMultiplier(uint24 multiplier) external onlyOwner {
        volatilityMultiplier = multiplier;
        emit VolatilityConfigUpdated(multiplier, maxStaleness);
    }

    function setMaxStaleness(uint256 maxStalenessSeconds) public override(EigenOracleModule) onlyOwner {
        super.setMaxStaleness(maxStalenessSeconds);
        emit VolatilityConfigUpdated(volatilityMultiplier, maxStalenessSeconds);
    }

    function beforeInitialize(IPoolManager, address, PoolKey calldata, uint160) external onlyAggregator {
        // No-op
    }

    function afterInitialize(IPoolManager, address, PoolKey calldata, uint160, int24) external onlyAggregator {
        // No-op
    }

    function beforeAddLiquidity(IPoolManager, address, PoolKey calldata, ModifyLiquidityParams calldata, bytes calldata)
        external
        onlyAggregator
    {
        // No-op
    }

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
    ) external onlyAggregator {
        // No-op
    }

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

    function beforeSwap(IPoolManager, address, PoolKey calldata, SwapParams calldata, bytes calldata hookData)
        external
        onlyAggregator
        returns (IMODLModule.BeforeSwapResult memory)
    {
        uint24 fee = _resolveFee(hookData);
        return IMODLModule.BeforeSwapResult({
            hasDelta: false,
            delta: BeforeSwapDelta.wrap(0),
            hasNewFee: true,
            newFee: fee | LPFeeLibrary.OVERRIDE_FEE_FLAG
        });
    }

    function afterSwap(IPoolManager, address, PoolKey calldata, SwapParams calldata, BalanceDelta, bytes calldata)
        external
        onlyAggregator
        returns (IMODLModule.AfterSwapResult memory)
    {
        return IMODLModule.AfterSwapResult({hasDelta: false, delta: 0});
    }

    function beforeDonate(IPoolManager, address, PoolKey calldata, uint256, uint256, bytes calldata)
        external
        onlyAggregator
    {
        // No-op
    }

    function afterDonate(IPoolManager, address, PoolKey calldata, uint256, uint256, bytes calldata)
        external
        onlyAggregator
    {
        // No-op
    }

    function _resolveFee(bytes calldata moduleData) private view returns (uint24) {
        if (moduleData.length == 0) return _computeFeeFromOracle();
        SwapFeeInstruction memory instruction = abi.decode(moduleData, (SwapFeeInstruction));
        if (!instruction.useCustomFee) {
            return _computeFeeFromOracle();
        }
        return _clampFee(instruction.customFee);
    }

    function _computeFeeFromOracle() private view returns (uint24) {
        uint256 volatilityIndex = _getFreshValue();
        uint256 variableFee = (volatilityIndex * uint256(volatilityMultiplier)) / MULTIPLIER_DENOMINATOR;
        uint256 candidate = uint256(baseFee) + variableFee;
        if (candidate > maxFee) candidate = maxFee;
        if (candidate < minFee) candidate = minFee;
        return uint24(candidate);
    }

    function _clampFee(uint24 fee) private view returns (uint24) {
        if (fee < minFee) return minFee;
        if (fee > maxFee) return maxFee;
        return fee;
    }

    function _setFeeBounds(uint24 minFee_, uint24 maxFee_, uint24 baseFee_) private {
        if (minFee_ > maxFee_ || maxFee_ > LPFeeLibrary.MAX_LP_FEE) revert InvalidFeeBounds(minFee_, maxFee_);
        if (baseFee_ < minFee_ || baseFee_ > maxFee_) revert InvalidFeeBounds(minFee_, maxFee_);
        minFee = minFee_;
        maxFee = maxFee_;
        baseFee = baseFee_;
        emit FeeBoundsUpdated(minFee_, maxFee_, baseFee_);
    }
}
