// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {DummyERC20} from "./utils/DummyERC20.sol";
import {MODLAggregator} from "../src/MODLAggregator.sol";
import {WhitelistModule} from "../src/modules/WhitelistModule.sol";
import {DynamicFeeModule} from "../src/modules/DynamicFeeModule.sol";
import {IMODLModule} from "../src/interfaces/IMODLModule.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {LPFeeLibrary} from "@uniswap/v4-core/src/libraries/LPFeeLibrary.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {ModifyLiquidityParams, SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {BeforeSwapDelta} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

contract MODLAggregatorTest is Test {
    MockPoolManager internal manager;
    MODLAggregator internal aggregator;
    WhitelistModule internal whitelist;
    DynamicFeeModule internal dynamicFee;
    PoolKey internal poolKey;
    SwapParams internal defaultSwap;
    ModifyLiquidityParams internal liquidityParams;
    address internal trader = address(0xBEEF);
    address internal lp = address(0xCAFE);

    function setUp() public {
        manager = new MockPoolManager();
        MODLAggregator.ModuleConfigInput[] memory empty = new MODLAggregator.ModuleConfigInput[](0);
        aggregator = new MODLAggregator(IPoolManager(address(manager)), empty);
        whitelist = new WhitelistModule(address(aggregator));
        dynamicFee = new DynamicFeeModule(address(aggregator), 100, 10_000, 100, 200);

        _configureModules(true);
        poolKey = _buildPoolKey();
        defaultSwap = SwapParams({zeroForOne: true, amountSpecified: -1e18, sqrtPriceLimitX96: 0});
        liquidityParams =
            ModifyLiquidityParams({tickLower: -120, tickUpper: 120, liquidityDelta: int256(1e18), salt: bytes32(0)});
    }

    function testModulesOrderedByPriority() public {
        MODLAggregator.ModuleConfigView[] memory configs = aggregator.getModules();
        assertEq(configs.length, 2);
        assertEq(address(configs[0].module), address(whitelist));
        assertEq(address(configs[1].module), address(dynamicFee));
    }

    function testBeforeSwapBlocksNonWhitelistedAddress() public {
        bytes memory hookData = abi.encode(new IMODLModule.ModuleCallData[](0));

        bytes memory reason = abi.encodeWithSelector(WhitelistModule.AddressNotWhitelisted.selector, trader);
        vm.expectRevert(
            abi.encodeWithSelector(
                MODLAggregator.ModuleExecutionFailed.selector,
                address(whitelist),
                MODLAggregator.Hook.BeforeSwap,
                reason
            )
        );
        manager.callBeforeSwap(aggregator, trader, poolKey, defaultSwap, hookData);
    }

    function testBeforeSwapUsesModuleHookData() public {
        whitelist.setWhitelist(trader, true);

        DynamicFeeModule.SwapFeeInstruction memory instruction =
            DynamicFeeModule.SwapFeeInstruction({useCustomFee: true, customFee: 777});
        IMODLModule.ModuleCallData[] memory data = new IMODLModule.ModuleCallData[](1);
        data[0] = IMODLModule.ModuleCallData({module: IMODLModule(address(dynamicFee)), data: abi.encode(instruction)});

        (, BeforeSwapDelta delta, uint24 feeOverride) =
            manager.callBeforeSwap(aggregator, trader, poolKey, defaultSwap, abi.encode(data));
        assertEq(BeforeSwapDelta.unwrap(delta), 0);
        assertTrue(feeOverride & LPFeeLibrary.OVERRIDE_FEE_FLAG != 0);
        uint24 unflagged = LPFeeLibrary.removeOverrideFlag(feeOverride);
        assertEq(unflagged, instruction.customFee);
    }

    function testIgnoreModuleFailureWhenFailOnRevertDisabled() public {
        MODLAggregator.ModuleHooks memory whitelistHooks = _whitelistHooks();
        MODLAggregator.ModuleHooks memory feeHooks = _dynamicFeeHooks();

        MODLAggregator.ModuleConfigInput[] memory configs = new MODLAggregator.ModuleConfigInput[](2);
        configs[0] = MODLAggregator.ModuleConfigInput({
            module: whitelist,
            hooks: whitelistHooks,
            failOnRevert: false,
            priority: 10
        });
        configs[1] =
            MODLAggregator.ModuleConfigInput({module: dynamicFee, hooks: feeHooks, failOnRevert: true, priority: 20});

        aggregator.setModules(configs);

        (, BeforeSwapDelta delta, uint24 feeOverride) =
            manager.callBeforeSwap(aggregator, trader, poolKey, defaultSwap, bytes(""));
        assertEq(BeforeSwapDelta.unwrap(delta), 0);
        assertTrue(feeOverride & LPFeeLibrary.OVERRIDE_FEE_FLAG != 0);
    }

    function testBeforeAddLiquidityEnforced() public {
        bytes memory hookData = abi.encode(new IMODLModule.ModuleCallData[](0));
        bytes memory reason = abi.encodeWithSelector(WhitelistModule.AddressNotWhitelisted.selector, lp);
        vm.expectRevert(
            abi.encodeWithSelector(
                MODLAggregator.ModuleExecutionFailed.selector,
                address(whitelist),
                MODLAggregator.Hook.BeforeAddLiquidity,
                reason
            )
        );
        manager.callBeforeAddLiquidity(aggregator, lp, poolKey, liquidityParams, hookData);
    }

    function _configureModules(bool whitelistMustSucceed) private {
        MODLAggregator.ModuleHooks memory whitelistHooks = _whitelistHooks();
        MODLAggregator.ModuleHooks memory feeHooks = _dynamicFeeHooks();

        MODLAggregator.ModuleConfigInput[] memory configs = new MODLAggregator.ModuleConfigInput[](2);
        configs[0] = MODLAggregator.ModuleConfigInput({
            module: whitelist,
            hooks: whitelistHooks,
            failOnRevert: whitelistMustSucceed,
            priority: 5
        });
        configs[1] =
            MODLAggregator.ModuleConfigInput({module: dynamicFee, hooks: feeHooks, failOnRevert: true, priority: 15});

        aggregator.setModules(configs);
    }

    function _whitelistHooks() private pure returns (MODLAggregator.ModuleHooks memory hooks) {
        hooks.beforeAddLiquidity = true;
        hooks.beforeRemoveLiquidity = true;
        hooks.beforeSwap = true;
        hooks.beforeDonate = true;
    }

    function _dynamicFeeHooks() private pure returns (MODLAggregator.ModuleHooks memory hooks) {
        hooks.beforeSwap = true;
    }

    function _buildPoolKey() private returns (PoolKey memory) {
        DummyERC20 tokenA = new DummyERC20("A", "A", 18);
        DummyERC20 tokenB = new DummyERC20("B", "B", 18);
        (address lower, address higher) =
            address(tokenA) < address(tokenB) ? (address(tokenA), address(tokenB)) : (address(tokenB), address(tokenA));
        return PoolKey({
            currency0: Currency.wrap(lower),
            currency1: Currency.wrap(higher),
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: 60,
            hooks: IHooks(address(aggregator))
        });
    }
}

contract MockPoolManager {
    function callBeforeSwap(
        MODLAggregator hook,
        address sender,
        PoolKey memory key,
        SwapParams memory params,
        bytes memory hookData
    ) external returns (bytes4, BeforeSwapDelta, uint24) {
        return hook.beforeSwap(sender, key, params, hookData);
    }

    function callBeforeAddLiquidity(
        MODLAggregator hook,
        address sender,
        PoolKey memory key,
        ModifyLiquidityParams memory params,
        bytes memory hookData
    ) external returns (bytes4) {
        return hook.beforeAddLiquidity(sender, key, params, hookData);
    }
}
