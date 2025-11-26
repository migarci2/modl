// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {ModifyLiquidityParams, SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";

/**
 * @title IMODLModule
 * @notice Interface implemented by every MODL module.
 * @dev Modules can opt-in to any subset of hook callbacks. Aggregator checks per-hook flags
 *      before invoking a module. Call data passed into the aggregator is expected to be ABI-encoded
 *      as `ModuleCallData[]` so that each module can consume its dedicated payload.
 */
interface IMODLModule {
    /**
     * @notice Encapsulates module specific payloads included in hookData.
     * @dev Users should encode an array of these structs and pass the resulting bytes as `hookData`
     *      when calling the PoolManager. Modules receive the payload where `module` matches their address.
     */
    struct ModuleCallData {
        IMODLModule module;
        bytes data;
    }

    /// @notice Optional delta contribution emitted by after/before hooks that return token adjustments.
    struct BalanceDeltaResult {
        bool hasDelta;
        BalanceDelta delta;
    }

    /// @notice Response returned from `beforeSwap`.
    struct BeforeSwapResult {
        bool hasDelta;
        BeforeSwapDelta delta;
        bool hasNewFee;
        uint24 newFee;
    }

    /// @notice Response returned from `afterSwap`.
    struct AfterSwapResult {
        bool hasDelta;
        int128 delta;
    }

    function moduleName() external view returns (string memory);

    function moduleVersion() external view returns (string memory);

    function beforeInitialize(IPoolManager poolManager, address sender, PoolKey calldata key, uint160 sqrtPriceX96)
        external;

    function afterInitialize(
        IPoolManager poolManager,
        address sender,
        PoolKey calldata key,
        uint160 sqrtPriceX96,
        int24 tick
    ) external;

    function beforeAddLiquidity(
        IPoolManager poolManager,
        address sender,
        PoolKey calldata key,
        ModifyLiquidityParams calldata params,
        bytes calldata hookData
    ) external;

    function afterAddLiquidity(
        IPoolManager poolManager,
        address sender,
        PoolKey calldata key,
        ModifyLiquidityParams calldata params,
        BalanceDelta delta,
        BalanceDelta feesAccrued,
        bytes calldata hookData
    ) external returns (BalanceDeltaResult memory);

    function beforeRemoveLiquidity(
        IPoolManager poolManager,
        address sender,
        PoolKey calldata key,
        ModifyLiquidityParams calldata params,
        bytes calldata hookData
    ) external;

    function afterRemoveLiquidity(
        IPoolManager poolManager,
        address sender,
        PoolKey calldata key,
        ModifyLiquidityParams calldata params,
        BalanceDelta delta,
        BalanceDelta feesAccrued,
        bytes calldata hookData
    ) external returns (BalanceDeltaResult memory);

    function beforeSwap(
        IPoolManager poolManager,
        address sender,
        PoolKey calldata key,
        SwapParams calldata params,
        bytes calldata hookData
    ) external returns (BeforeSwapResult memory);

    function afterSwap(
        IPoolManager poolManager,
        address sender,
        PoolKey calldata key,
        SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata hookData
    ) external returns (AfterSwapResult memory);

    function beforeDonate(
        IPoolManager poolManager,
        address sender,
        PoolKey calldata key,
        uint256 amount0,
        uint256 amount1,
        bytes calldata hookData
    ) external;

    function afterDonate(
        IPoolManager poolManager,
        address sender,
        PoolKey calldata key,
        uint256 amount0,
        uint256 amount1,
        bytes calldata hookData
    ) external;
}
