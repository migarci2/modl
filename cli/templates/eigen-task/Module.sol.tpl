// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IMODLModule} from "@modl/core/src/interfaces/IMODLModule.sol";
import {EigenTaskModule, IEigenTaskManager} from "@modl/core/src/modules/eigen/EigenTaskModule.sol";
import {BalanceDelta, BalanceDeltaLibrary} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {ModifyLiquidityParams, SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";

/// @title {{MODULE_NAME}}
/// @notice Example async task module targeting an EigenLayer AVS.
contract {{MODULE_NAME}} is IMODLModule, EigenTaskModule, Ownable {
    address public immutable AGGREGATOR;
    bytes32 public constant HOOK_BEFORE_SWAP = keccak256("beforeSwap");

    error NotAggregator(address caller);

    modifier onlyAggregator() {
        if (msg.sender != AGGREGATOR) revert NotAggregator(msg.sender);
        _;
    }

    constructor(address aggregator_, address taskManager, address fulfillmentAuthorizer)
        EigenTaskModule(taskManager, fulfillmentAuthorizer)
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

    function beforeSwap(IPoolManager, address sender, PoolKey calldata, SwapParams calldata, bytes calldata hookData)
        external
        onlyAggregator
        returns (IMODLModule.BeforeSwapResult memory)
    {
        _postTask(hookData, sender, hookData);
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

    function _handleTaskResult(bytes32 taskId, TaskContext memory ctx, bytes calldata result) internal override {
        emit EigenTaskResult(taskId, ctx.user, ctx.hookData, result);
    }

    event EigenTaskResult(bytes32 indexed taskId, address indexed user, bytes hookData, bytes result);
}
