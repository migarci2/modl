// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {BaseHook} from "@uniswap/v4-periphery/src/utils/BaseHook.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {BalanceDelta, BalanceDeltaLibrary} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {
    BeforeSwapDelta, BeforeSwapDeltaLibrary, toBeforeSwapDelta
} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {SafeCast} from "@uniswap/v4-core/src/libraries/SafeCast.sol";
import {ModifyLiquidityParams, SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {IMODLModule} from "./interfaces/IMODLModule.sol";

/**
 * @title MODLAggregator
 * @notice Base hook that fans out every lifecycle callback to a list of registered modules.
 * @dev Modules are executed sequentially according to their priority. Each hook only touches the
 *      modules that opted-in through `ModuleHooks`. Failures are either bubbled up or ignored based
 *      on the module's configuration, preventing one faulty strategy from halting the entire pool.
 */
contract MODLAggregator is BaseHook, Ownable {
    using BalanceDeltaLibrary for BalanceDelta;
    using BeforeSwapDeltaLibrary for BeforeSwapDelta;
    using SafeCast for int256;

    uint256 public constant MAX_MODULES = 16;

    uint16 private constant _HOOK_BEFORE_INITIALIZE = 1 << 0;
    uint16 private constant _HOOK_AFTER_INITIALIZE = 1 << 1;
    uint16 private constant _HOOK_BEFORE_ADD = 1 << 2;
    uint16 private constant _HOOK_AFTER_ADD = 1 << 3;
    uint16 private constant _HOOK_BEFORE_REMOVE = 1 << 4;
    uint16 private constant _HOOK_AFTER_REMOVE = 1 << 5;
    uint16 private constant _HOOK_BEFORE_SWAP = 1 << 6;
    uint16 private constant _HOOK_AFTER_SWAP = 1 << 7;
    uint16 private constant _HOOK_BEFORE_DONATE = 1 << 8;
    uint16 private constant _HOOK_AFTER_DONATE = 1 << 9;

    enum Hook {
        BeforeInitialize,
        AfterInitialize,
        BeforeAddLiquidity,
        AfterAddLiquidity,
        BeforeRemoveLiquidity,
        AfterRemoveLiquidity,
        BeforeSwap,
        AfterSwap,
        BeforeDonate,
        AfterDonate
    }

    struct ModuleHooks {
        bool beforeInitialize;
        bool afterInitialize;
        bool beforeAddLiquidity;
        bool afterAddLiquidity;
        bool beforeRemoveLiquidity;
        bool afterRemoveLiquidity;
        bool beforeSwap;
        bool afterSwap;
        bool beforeDonate;
        bool afterDonate;
    }

    struct ModuleConfigInput {
        IMODLModule module;
        ModuleHooks hooks;
        bool failOnRevert;
        uint32 priority;
    }

    struct ModuleConfig {
        IMODLModule module;
        uint16 hooksBitmap;
        bool failOnRevert;
        uint32 priority;
    }

    struct ModuleConfigView {
        IMODLModule module;
        ModuleHooks hooks;
        bool failOnRevert;
        uint32 priority;
    }

    error ModuleExecutionFailed(address module, Hook hook, bytes reason);
    error InvalidModule(address module);
    error DuplicateModule(address module);
    error TooManyModules(uint256 attempted);

    event ModuleConfigured(address indexed module, uint32 priority, uint16 hooksBitmap, bool failOnRevert);
    event ModuleExecutionSkipped(address indexed module, Hook hook, bytes reason);

    ModuleConfig[] private _modules;
    mapping(address module => bool) public isModuleRegistered;

    constructor(IPoolManager poolManager, ModuleConfigInput[] memory initialModules)
        BaseHook(poolManager)
        Ownable(msg.sender)
    {
        if (initialModules.length > 0) {
            setModules(initialModules);
        }
    }

    /**
     * @notice Hook permissions requested from the PoolManager.
     * @dev Aggregator exposes all hooks (including delta returning callbacks) as it forwards them
     *      to the installed modules.
     */
    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: true,
            afterInitialize: true,
            beforeAddLiquidity: true,
            afterAddLiquidity: true,
            beforeRemoveLiquidity: true,
            afterRemoveLiquidity: true,
            beforeSwap: true,
            afterSwap: true,
            beforeDonate: true,
            afterDonate: true,
            beforeSwapReturnDelta: true,
            afterSwapReturnDelta: true,
            afterAddLiquidityReturnDelta: true,
            afterRemoveLiquidityReturnDelta: true
        });
    }

    /// @inheritdoc BaseHook
    function validateHookAddress(BaseHook) internal pure override {
        // No-op in development. Deploy via a HookMiner in production so the address matches permissions.
    }

    // ----------------------------------------
    // Module Management
    // ----------------------------------------

    function moduleCount() external view returns (uint256) {
        return _modules.length;
    }

    function getModules() external view returns (ModuleConfigView[] memory views) {
        uint256 length = _modules.length;
        views = new ModuleConfigView[](length);
        for (uint256 i; i < length; ++i) {
            ModuleConfig storage stored = _modules[i];
            views[i] = ModuleConfigView({
                module: stored.module,
                hooks: _decodeHooks(stored.hooksBitmap),
                failOnRevert: stored.failOnRevert,
                priority: stored.priority
            });
        }
    }

    function setModules(ModuleConfigInput[] memory configs) public onlyOwner {
        if (configs.length > MAX_MODULES) revert TooManyModules(configs.length);

        _clearRegistry();

        delete _modules;

        for (uint256 i; i < configs.length; ++i) {
            ModuleConfigInput memory input = configs[i];
            if (address(input.module) == address(0)) revert InvalidModule(address(0));
            if (isModuleRegistered[address(input.module)]) revert DuplicateModule(address(input.module));

            uint16 hooksBitmap = _encodeHooks(input.hooks);
            _modules.push(
                ModuleConfig({
                    module: input.module,
                    hooksBitmap: hooksBitmap,
                    failOnRevert: input.failOnRevert,
                    priority: input.priority
                })
            );
            isModuleRegistered[address(input.module)] = true;
            emit ModuleConfigured(address(input.module), input.priority, hooksBitmap, input.failOnRevert);
        }

        _sortModulesByPriority();
    }

    // ----------------------------------------
    // Hook overrides
    // ----------------------------------------

    function _beforeInitialize(address sender, PoolKey calldata key, uint160 sqrtPriceX96)
        internal
        override
        returns (bytes4)
    {
        _executeBeforeInitialize(sender, key, sqrtPriceX96);
        return IHooks.beforeInitialize.selector;
    }

    function _afterInitialize(address sender, PoolKey calldata key, uint160 sqrtPriceX96, int24 tick)
        internal
        override
        returns (bytes4)
    {
        _executeAfterInitialize(sender, key, sqrtPriceX96, tick);
        return IHooks.afterInitialize.selector;
    }

    function _beforeAddLiquidity(
        address sender,
        PoolKey calldata key,
        ModifyLiquidityParams calldata params,
        bytes calldata hookData
    ) internal override returns (bytes4) {
        IMODLModule.ModuleCallData[] memory moduleData = _decodeHookData(hookData);
        _executeBeforeModifyLiquidity(Hook.BeforeAddLiquidity, sender, key, params, moduleData);
        return IHooks.beforeAddLiquidity.selector;
    }

    function _beforeRemoveLiquidity(
        address sender,
        PoolKey calldata key,
        ModifyLiquidityParams calldata params,
        bytes calldata hookData
    ) internal override returns (bytes4) {
        IMODLModule.ModuleCallData[] memory moduleData = _decodeHookData(hookData);
        _executeBeforeModifyLiquidity(Hook.BeforeRemoveLiquidity, sender, key, params, moduleData);
        return IHooks.beforeRemoveLiquidity.selector;
    }

    function _afterAddLiquidity(
        address sender,
        PoolKey calldata key,
        ModifyLiquidityParams calldata params,
        BalanceDelta delta,
        BalanceDelta feesAccrued,
        bytes calldata hookData
    ) internal override returns (bytes4, BalanceDelta) {
        IMODLModule.ModuleCallData[] memory moduleData = _decodeHookData(hookData);
        BalanceDelta netDelta = _executeAfterAddLiquidity(sender, key, params, delta, feesAccrued, moduleData);
        return (IHooks.afterAddLiquidity.selector, netDelta);
    }

    function _afterRemoveLiquidity(
        address sender,
        PoolKey calldata key,
        ModifyLiquidityParams calldata params,
        BalanceDelta delta,
        BalanceDelta feesAccrued,
        bytes calldata hookData
    ) internal override returns (bytes4, BalanceDelta) {
        IMODLModule.ModuleCallData[] memory moduleData = _decodeHookData(hookData);
        BalanceDelta netDelta = _executeAfterRemoveLiquidity(sender, key, params, delta, feesAccrued, moduleData);
        return (IHooks.afterRemoveLiquidity.selector, netDelta);
    }

    function _beforeSwap(address sender, PoolKey calldata key, SwapParams calldata params, bytes calldata hookData)
        internal
        override
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        IMODLModule.ModuleCallData[] memory moduleData = _decodeHookData(hookData);
        (BeforeSwapDelta delta, uint24 feeOverride) = _executeBeforeSwap(sender, key, params, moduleData);
        return (IHooks.beforeSwap.selector, delta, feeOverride);
    }

    function _afterSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata hookData
    ) internal override returns (bytes4, int128) {
        IMODLModule.ModuleCallData[] memory moduleData = _decodeHookData(hookData);
        int128 hookDelta = _executeAfterSwap(sender, key, params, delta, moduleData);
        return (IHooks.afterSwap.selector, hookDelta);
    }

    function _beforeDonate(
        address sender,
        PoolKey calldata key,
        uint256 amount0,
        uint256 amount1,
        bytes calldata hookData
    ) internal override returns (bytes4) {
        IMODLModule.ModuleCallData[] memory moduleData = _decodeHookData(hookData);
        _executeDonationHook(Hook.BeforeDonate, sender, key, amount0, amount1, moduleData);
        return IHooks.beforeDonate.selector;
    }

    function _afterDonate(
        address sender,
        PoolKey calldata key,
        uint256 amount0,
        uint256 amount1,
        bytes calldata hookData
    ) internal override returns (bytes4) {
        IMODLModule.ModuleCallData[] memory moduleData = _decodeHookData(hookData);
        _executeDonationHook(Hook.AfterDonate, sender, key, amount0, amount1, moduleData);
        return IHooks.afterDonate.selector;
    }

    // ----------------------------------------
    // Internal execution helpers
    // ----------------------------------------

    function _executeBeforeInitialize(address sender, PoolKey calldata key, uint160 sqrtPriceX96) private {
        uint256 length = _modules.length;
        for (uint256 i; i < length; ++i) {
            ModuleConfig storage config = _modules[i];
            if (!_hasHook(config.hooksBitmap, _HOOK_BEFORE_INITIALIZE)) continue;
            try config.module.beforeInitialize(poolManager, sender, key, sqrtPriceX96) {}
            catch (bytes memory reason) {
                _handleModuleError(config, Hook.BeforeInitialize, reason);
            }
        }
    }

    function _executeAfterInitialize(address sender, PoolKey calldata key, uint160 sqrtPriceX96, int24 tick) private {
        uint256 length = _modules.length;
        for (uint256 i; i < length; ++i) {
            ModuleConfig storage config = _modules[i];
            if (!_hasHook(config.hooksBitmap, _HOOK_AFTER_INITIALIZE)) continue;
            try config.module.afterInitialize(poolManager, sender, key, sqrtPriceX96, tick) {}
            catch (bytes memory reason) {
                _handleModuleError(config, Hook.AfterInitialize, reason);
            }
        }
    }

    function _executeBeforeModifyLiquidity(
        Hook hook,
        address sender,
        PoolKey calldata key,
        ModifyLiquidityParams calldata params,
        IMODLModule.ModuleCallData[] memory moduleData
    ) private {
        uint16 flag = _flagForHook(hook);
        bool isAdd = hook == Hook.BeforeAddLiquidity;
        uint256 length = _modules.length;
        for (uint256 i; i < length; ++i) {
            ModuleConfig storage config = _modules[i];
            if (!_hasHook(config.hooksBitmap, flag)) continue;
            bytes memory data = _moduleCalldata(config.module, moduleData);
            if (isAdd) {
                try config.module.beforeAddLiquidity(poolManager, sender, key, params, data) {}
                catch (bytes memory reason) {
                    _handleModuleError(config, hook, reason);
                }
            } else {
                try config.module.beforeRemoveLiquidity(poolManager, sender, key, params, data) {}
                catch (bytes memory reason) {
                    _handleModuleError(config, hook, reason);
                }
            }
        }
    }

    function _executeAfterAddLiquidity(
        address sender,
        PoolKey calldata key,
        ModifyLiquidityParams calldata params,
        BalanceDelta delta,
        BalanceDelta feesAccrued,
        IMODLModule.ModuleCallData[] memory moduleData
    ) private returns (BalanceDelta netDelta) {
        uint256 length = _modules.length;
        netDelta = BalanceDeltaLibrary.ZERO_DELTA;

        for (uint256 i; i < length; ++i) {
            ModuleConfig storage config = _modules[i];
            if (!_hasHook(config.hooksBitmap, _HOOK_AFTER_ADD)) continue;
            bytes memory data = _moduleCalldata(config.module, moduleData);

            try config.module.afterAddLiquidity(poolManager, sender, key, params, delta, feesAccrued, data) returns (
                IMODLModule.BalanceDeltaResult memory result
            ) {
                if (result.hasDelta) {
                    netDelta = netDelta + result.delta;
                }
            } catch (bytes memory reason) {
                _handleModuleError(config, Hook.AfterAddLiquidity, reason);
            }
        }
    }

    function _executeAfterRemoveLiquidity(
        address sender,
        PoolKey calldata key,
        ModifyLiquidityParams calldata params,
        BalanceDelta delta,
        BalanceDelta feesAccrued,
        IMODLModule.ModuleCallData[] memory moduleData
    ) private returns (BalanceDelta netDelta) {
        uint256 length = _modules.length;
        netDelta = BalanceDeltaLibrary.ZERO_DELTA;

        for (uint256 i; i < length; ++i) {
            ModuleConfig storage config = _modules[i];
            if (!_hasHook(config.hooksBitmap, _HOOK_AFTER_REMOVE)) continue;
            bytes memory data = _moduleCalldata(config.module, moduleData);

            try config.module.afterRemoveLiquidity(poolManager, sender, key, params, delta, feesAccrued, data) returns (
                IMODLModule.BalanceDeltaResult memory result
            ) {
                if (result.hasDelta) {
                    netDelta = netDelta + result.delta;
                }
            } catch (bytes memory reason) {
                _handleModuleError(config, Hook.AfterRemoveLiquidity, reason);
            }
        }
    }

    function _executeBeforeSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata params,
        IMODLModule.ModuleCallData[] memory moduleData
    ) private returns (BeforeSwapDelta delta, uint24 lpFeeOverride) {
        uint256 length = _modules.length;
        delta = BeforeSwapDelta.wrap(0);
        lpFeeOverride = 0;

        for (uint256 i; i < length; ++i) {
            ModuleConfig storage config = _modules[i];
            if (!_hasHook(config.hooksBitmap, _HOOK_BEFORE_SWAP)) continue;
            bytes memory data = _moduleCalldata(config.module, moduleData);
            try config.module.beforeSwap(poolManager, sender, key, params, data) returns (
                IMODLModule.BeforeSwapResult memory result
            ) {
                if (result.hasDelta) {
                    delta = _addBeforeSwapDelta(delta, result.delta);
                }
                if (result.hasNewFee) {
                    lpFeeOverride = result.newFee;
                }
            } catch (bytes memory reason) {
                _handleModuleError(config, Hook.BeforeSwap, reason);
            }
        }
    }

    function _executeAfterSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata params,
        BalanceDelta delta,
        IMODLModule.ModuleCallData[] memory moduleData
    ) private returns (int128 aggregateDelta) {
        uint256 length = _modules.length;
        int256 accumulator;

        for (uint256 i; i < length; ++i) {
            ModuleConfig storage config = _modules[i];
            if (!_hasHook(config.hooksBitmap, _HOOK_AFTER_SWAP)) continue;
            bytes memory data = _moduleCalldata(config.module, moduleData);
            try config.module.afterSwap(poolManager, sender, key, params, delta, data) returns (
                IMODLModule.AfterSwapResult memory result
            ) {
                if (result.hasDelta) {
                    accumulator += int256(result.delta);
                }
            } catch (bytes memory reason) {
                _handleModuleError(config, Hook.AfterSwap, reason);
            }
        }

        aggregateDelta = accumulator.toInt128();
    }

    function _executeDonationHook(
        Hook hook,
        address sender,
        PoolKey calldata key,
        uint256 amount0,
        uint256 amount1,
        IMODLModule.ModuleCallData[] memory moduleData
    ) private {
        uint16 flag = _flagForHook(hook);
        uint256 length = _modules.length;
        for (uint256 i; i < length; ++i) {
            ModuleConfig storage config = _modules[i];
            if (!_hasHook(config.hooksBitmap, flag)) continue;
            bytes memory data = _moduleCalldata(config.module, moduleData);
            if (hook == Hook.BeforeDonate) {
                try config.module.beforeDonate(poolManager, sender, key, amount0, amount1, data) {}
                catch (bytes memory reason) {
                    _handleModuleError(config, hook, reason);
                }
            } else {
                try config.module.afterDonate(poolManager, sender, key, amount0, amount1, data) {}
                catch (bytes memory reason) {
                    _handleModuleError(config, hook, reason);
                }
            }
        }
    }

    // ----------------------------------------
    // Hook helpers
    // ----------------------------------------

    function _addBeforeSwapDelta(BeforeSwapDelta a, BeforeSwapDelta b) private pure returns (BeforeSwapDelta) {
        if (BeforeSwapDelta.unwrap(a) == 0) return b;
        if (BeforeSwapDelta.unwrap(b) == 0) return a;

        int256 specified = int256(a.getSpecifiedDelta()) + int256(b.getSpecifiedDelta());
        int256 unspecified = int256(a.getUnspecifiedDelta()) + int256(b.getUnspecifiedDelta());

        return toBeforeSwapDelta(specified.toInt128(), unspecified.toInt128());
    }

    function _moduleCalldata(IMODLModule module, IMODLModule.ModuleCallData[] memory payloads)
        private
        pure
        returns (bytes memory)
    {
        uint256 length = payloads.length;
        for (uint256 i; i < length; ++i) {
            if (address(payloads[i].module) == address(module)) {
                return payloads[i].data;
            }
        }
        return bytes("");
    }

    function _decodeHookData(bytes calldata hookData)
        private
        pure
        returns (IMODLModule.ModuleCallData[] memory moduleData)
    {
        if (hookData.length == 0) {
            return new IMODLModule.ModuleCallData[](0);
        }
        moduleData = abi.decode(hookData, (IMODLModule.ModuleCallData[]));
    }

    function _handleModuleError(ModuleConfig storage config, Hook hook, bytes memory reason) private {
        if (config.failOnRevert) {
            revert ModuleExecutionFailed(address(config.module), hook, reason);
        }
        emit ModuleExecutionSkipped(address(config.module), hook, reason);
    }

    function _clearRegistry() private {
        uint256 length = _modules.length;
        for (uint256 i; i < length; ++i) {
            delete isModuleRegistered[address(_modules[i].module)];
        }
    }

    function _flagForHook(Hook hook) private pure returns (uint16) {
        if (hook == Hook.BeforeInitialize) return _HOOK_BEFORE_INITIALIZE;
        if (hook == Hook.AfterInitialize) return _HOOK_AFTER_INITIALIZE;
        if (hook == Hook.BeforeAddLiquidity) return _HOOK_BEFORE_ADD;
        if (hook == Hook.AfterAddLiquidity) return _HOOK_AFTER_ADD;
        if (hook == Hook.BeforeRemoveLiquidity) return _HOOK_BEFORE_REMOVE;
        if (hook == Hook.AfterRemoveLiquidity) return _HOOK_AFTER_REMOVE;
        if (hook == Hook.BeforeSwap) return _HOOK_BEFORE_SWAP;
        if (hook == Hook.AfterSwap) return _HOOK_AFTER_SWAP;
        if (hook == Hook.BeforeDonate) return _HOOK_BEFORE_DONATE;
        return _HOOK_AFTER_DONATE;
    }

    function _hasHook(uint16 bitmap, uint16 flag) private pure returns (bool) {
        return bitmap & flag != 0;
    }

    function _encodeHooks(ModuleHooks memory hooks) private pure returns (uint16 bitmap) {
        if (hooks.beforeInitialize) bitmap |= _HOOK_BEFORE_INITIALIZE;
        if (hooks.afterInitialize) bitmap |= _HOOK_AFTER_INITIALIZE;
        if (hooks.beforeAddLiquidity) bitmap |= _HOOK_BEFORE_ADD;
        if (hooks.afterAddLiquidity) bitmap |= _HOOK_AFTER_ADD;
        if (hooks.beforeRemoveLiquidity) bitmap |= _HOOK_BEFORE_REMOVE;
        if (hooks.afterRemoveLiquidity) bitmap |= _HOOK_AFTER_REMOVE;
        if (hooks.beforeSwap) bitmap |= _HOOK_BEFORE_SWAP;
        if (hooks.afterSwap) bitmap |= _HOOK_AFTER_SWAP;
        if (hooks.beforeDonate) bitmap |= _HOOK_BEFORE_DONATE;
        if (hooks.afterDonate) bitmap |= _HOOK_AFTER_DONATE;
    }

    function _decodeHooks(uint16 bitmap) private pure returns (ModuleHooks memory hooks) {
        hooks.beforeInitialize = _hasHook(bitmap, _HOOK_BEFORE_INITIALIZE);
        hooks.afterInitialize = _hasHook(bitmap, _HOOK_AFTER_INITIALIZE);
        hooks.beforeAddLiquidity = _hasHook(bitmap, _HOOK_BEFORE_ADD);
        hooks.afterAddLiquidity = _hasHook(bitmap, _HOOK_AFTER_ADD);
        hooks.beforeRemoveLiquidity = _hasHook(bitmap, _HOOK_BEFORE_REMOVE);
        hooks.afterRemoveLiquidity = _hasHook(bitmap, _HOOK_AFTER_REMOVE);
        hooks.beforeSwap = _hasHook(bitmap, _HOOK_BEFORE_SWAP);
        hooks.afterSwap = _hasHook(bitmap, _HOOK_AFTER_SWAP);
        hooks.beforeDonate = _hasHook(bitmap, _HOOK_BEFORE_DONATE);
        hooks.afterDonate = _hasHook(bitmap, _HOOK_AFTER_DONATE);
    }

    function _sortModulesByPriority() private {
        uint256 length = _modules.length;
        for (uint256 i = 1; i < length; ++i) {
            ModuleConfig memory current = _modules[i];
            uint256 j = i;
            while (j > 0 && current.priority < _modules[j - 1].priority) {
                _modules[j] = _modules[j - 1];
                unchecked {
                    --j;
                }
            }
            _modules[j] = current;
        }
    }
}
