// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {FhenixAsyncModule, IFheComputationManager} from "@modl/core/src/modules/fhenix/FhenixAsyncModule.sol";
import {IMODLModule} from "@modl/core/src/interfaces/IMODLModule.sol";
import {BalanceDelta, BalanceDeltaLibrary} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {ModifyLiquidityParams, SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";

/// @title {{MODULE_NAME}}
/// @notice Example async FHE module that posts a computation request during a hook.
contract {{MODULE_NAME}} is IMODLModule, FhenixAsyncModule, Ownable {
    address public immutable AGGREGATOR;
    bytes32 public constant HOOK_BEFORE_SWAP = keccak256("beforeSwap");

    error NotAggregator(address caller);

    modifier onlyAggregator() {
        if (msg.sender != AGGREGATOR) revert NotAggregator(msg.sender);
        _;
    }

    constructor(address aggregator_, address fheManager, address fulfillmentAuthorizer)
        Ownable(msg.sender)
        FhenixAsyncModule(fheManager, fulfillmentAuthorizer)
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

    /// @notice Example: request a computation whenever beforeSwap is called.
    function beforeSwap(IPoolManager, address sender, PoolKey calldata, SwapParams calldata, bytes calldata hookData)
        external
        onlyAggregator
        returns (IMODLModule.BeforeSwapResult memory)
    {
        _requestFhe(hookData, HOOK_BEFORE_SWAP, sender, hookData);
        return
            IMODLModule.BeforeSwapResult({hasDelta: false, delta: BeforeSwapDelta.wrap(0), hasNewFee: false, newFee: 0});
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

    /// @notice Implement how you handle the decrypted result from Fhenix.
    function _handleFheResult(uint256 taskId, FheTaskContext memory ctx, bytes calldata result) internal override {
        // TODO: decode result and apply to your module state
        // Example: emit an event
        emit FheResultHandled(taskId, ctx.user, ctx.hookType, result);
    }

    event FheResultHandled(uint256 indexed taskId, address indexed user, bytes32 hookType, bytes result);
}
