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
import {BalanceDelta, BalanceDeltaLibrary} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

contract MODLAggregatorTest is Test {
    MockPoolManager internal manager;
    MODLAggregator internal aggregator;
    WhitelistModule internal whitelist;
    DynamicFeeModule internal dynamicFee;
    GasCheckingModule internal gasModule;
    RoutingTestModule internal routeModuleA;
    RoutingTestModule internal routeModuleB;
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
        gasModule = new GasCheckingModule(address(aggregator), 60_000);
        routeModuleA = new RoutingTestModule(address(aggregator), "A");
        routeModuleB = new RoutingTestModule(address(aggregator), "B");

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

    function testIgnoreModuleFailureWhenNotCritical() public {
        MODLAggregator.ModuleHooks memory whitelistHooks = _whitelistHooks();
        MODLAggregator.ModuleHooks memory feeHooks = _dynamicFeeHooks();

        MODLAggregator.ModuleConfigInput[] memory configs = new MODLAggregator.ModuleConfigInput[](2);
        configs[0] = MODLAggregator.ModuleConfigInput({
            module: whitelist,
            hooks: whitelistHooks,
            critical: false,
            priority: 10,
            gasLimit: 0
        });
        configs[1] = MODLAggregator.ModuleConfigInput({
            module: dynamicFee,
            hooks: feeHooks,
            critical: true,
            priority: 20,
            gasLimit: 0
        });

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

    function testGasLimitedModuleSkipsWhenNotCritical() public {
        whitelist.setWhitelist(trader, true);
        _configureWithGasModule(false, 10_000);

        vm.expectEmit(true, true, false, false);
        emit MODLAggregator.ModuleExecutionSkipped(address(gasModule), MODLAggregator.Hook.BeforeSwap, bytes(""));

        (, BeforeSwapDelta delta, uint24 feeOverride) =
            manager.callBeforeSwap(aggregator, trader, poolKey, defaultSwap, bytes(""));
        assertEq(BeforeSwapDelta.unwrap(delta), 0);
        assertTrue(feeOverride & LPFeeLibrary.OVERRIDE_FEE_FLAG != 0);
        uint24 unflagged = LPFeeLibrary.removeOverrideFlag(feeOverride);
        assertEq(unflagged, dynamicFee.baseFee());
    }

    function testGasLimitedModuleRevertsWhenCritical() public {
        whitelist.setWhitelist(trader, true);
        _configureWithGasModule(true, 10_000);

        try manager.callBeforeSwap(aggregator, trader, poolKey, defaultSwap, bytes("")) {
            fail("expected revert");
        } catch (bytes memory reason) {
            _assertSelector(reason, MODLAggregator.ModuleExecutionFailed.selector);
        }
    }

    function testRouteMissingSelectorReverts() public {
        IRoutePlaceOrder router = IRoutePlaceOrder(address(aggregator));
        try router.placeOrder(1) {
            fail("expected revert");
        } catch (bytes memory reason) {
            _assertSelector(reason, MODLAggregator.RouteNotFound.selector);
        }
    }

    function testRouteSingleModuleForwarding() public {
        _configureRoutingModules();
        uint16[] memory modules = new uint16[](1);
        modules[0] = _moduleIndex(address(routeModuleA));
        aggregator.setRoute(RoutingTestModule.placeOrder.selector, modules, MODLAggregator.ExecMode.FIRST);

        IRoutePlaceOrder router = IRoutePlaceOrder(address(aggregator));
        bytes32 orderId = router.placeOrder(77);

        assertEq(orderId, routeModuleA.lastOrderId());
        assertEq(routeModuleA.lastOrderAmount(), 77);
        assertEq(routeModuleB.callCount(), 0);
    }

    function testRouteAllModulesReturnLastResult() public {
        _configureRoutingModules();
        uint16[] memory modules = new uint16[](2);
        modules[0] = _moduleIndex(address(routeModuleA));
        modules[1] = _moduleIndex(address(routeModuleB));
        aggregator.setRoute(RoutingTestModule.placeOrder.selector, modules, MODLAggregator.ExecMode.ALL);

        IRoutePlaceOrder router = IRoutePlaceOrder(address(aggregator));
        bytes32 orderId = router.placeOrder(111);

        assertEq(routeModuleA.callCount(), 1);
        assertEq(routeModuleB.callCount(), 1);
        assertEq(orderId, routeModuleB.lastOrderId());
    }

    function testClearRouteRemovesConfiguration() public {
        _configureRoutingModules();
        uint16[] memory modules = new uint16[](1);
        modules[0] = _moduleIndex(address(routeModuleA));
        bytes4 selector = RoutingTestModule.placeOrder.selector;
        aggregator.setRoute(selector, modules, MODLAggregator.ExecMode.FIRST);
        aggregator.clearRoute(selector);

        IRoutePlaceOrder router = IRoutePlaceOrder(address(aggregator));
        try router.placeOrder(5) {
            fail("expected revert");
        } catch (bytes memory reason) {
            _assertSelector(reason, MODLAggregator.RouteNotFound.selector);
        }
    }

    function _configureModules(bool whitelistMustSucceed) private {
        MODLAggregator.ModuleHooks memory whitelistHooks = _whitelistHooks();
        MODLAggregator.ModuleHooks memory feeHooks = _dynamicFeeHooks();

        MODLAggregator.ModuleConfigInput[] memory configs = new MODLAggregator.ModuleConfigInput[](2);
        configs[0] = MODLAggregator.ModuleConfigInput({
            module: whitelist,
            hooks: whitelistHooks,
            critical: whitelistMustSucceed,
            priority: 5,
            gasLimit: 0
        });
        configs[1] = MODLAggregator.ModuleConfigInput({
            module: dynamicFee,
            hooks: feeHooks,
            critical: true,
            priority: 15,
            gasLimit: 0
        });

        aggregator.setModules(configs);
    }

    function _configureWithGasModule(bool moduleCritical, uint32 gasLimit) private {
        MODLAggregator.ModuleHooks memory whitelistHooks = _whitelistHooks();
        MODLAggregator.ModuleHooks memory feeHooks = _dynamicFeeHooks();
        MODLAggregator.ModuleHooks memory gasHooks;
        gasHooks.beforeSwap = true;

        MODLAggregator.ModuleConfigInput[] memory configs = new MODLAggregator.ModuleConfigInput[](3);
        configs[0] = MODLAggregator.ModuleConfigInput({
            module: whitelist,
            hooks: whitelistHooks,
            critical: true,
            priority: 5,
            gasLimit: 0
        });
        configs[1] = MODLAggregator.ModuleConfigInput({
            module: dynamicFee,
            hooks: feeHooks,
            critical: true,
            priority: 15,
            gasLimit: 0
        });
        configs[2] = MODLAggregator.ModuleConfigInput({
            module: gasModule,
            hooks: gasHooks,
            critical: moduleCritical,
            priority: 25,
            gasLimit: gasLimit
        });

        aggregator.setModules(configs);
    }

    function _configureRoutingModules() private {
        MODLAggregator.ModuleHooks memory whitelistHooks = _whitelistHooks();
        MODLAggregator.ModuleHooks memory feeHooks = _dynamicFeeHooks();
        MODLAggregator.ModuleHooks memory emptyHooks;

        MODLAggregator.ModuleConfigInput[] memory configs = new MODLAggregator.ModuleConfigInput[](4);
        configs[0] = MODLAggregator.ModuleConfigInput({
            module: whitelist,
            hooks: whitelistHooks,
            critical: true,
            priority: 5,
            gasLimit: 0
        });
        configs[1] = MODLAggregator.ModuleConfigInput({
            module: dynamicFee,
            hooks: feeHooks,
            critical: true,
            priority: 15,
            gasLimit: 0
        });
        configs[2] = MODLAggregator.ModuleConfigInput({
            module: routeModuleA,
            hooks: emptyHooks,
            critical: true,
            priority: 25,
            gasLimit: 0
        });
        configs[3] = MODLAggregator.ModuleConfigInput({
            module: routeModuleB,
            hooks: emptyHooks,
            critical: true,
            priority: 30,
            gasLimit: 0
        });
        aggregator.setModules(configs);
    }

    function _moduleIndex(address module) private view returns (uint16) {
        MODLAggregator.ModuleConfigView[] memory configs = aggregator.getModules();
        uint16 length = uint16(configs.length);
        for (uint16 i; i < length; ++i) {
            if (address(configs[i].module) == module) {
                return i;
            }
        }
        revert("module not registered");
    }

    function _assertSelector(bytes memory reason, bytes4 expected) private {
        bytes4 actual;
        assembly {
            actual := mload(add(reason, 32))
        }
        assertEq(uint32(actual), uint32(expected));
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

interface IRoutePlaceOrder {
    function placeOrder(uint256 amount) external returns (bytes32);
}

contract GasCheckingModule is IMODLModule {
    address public immutable aggregator;
    uint256 public immutable minGas;
    uint256 public successCount;

    error NotAggregator(address caller);
    error GasTooLow(uint256 provided, uint256 required);

    modifier onlyAggregator() {
        if (msg.sender != aggregator) revert NotAggregator(msg.sender);
        _;
    }

    constructor(address aggregator_, uint256 minGas_) {
        aggregator = aggregator_;
        minGas = minGas_;
    }

    function moduleName() external pure returns (string memory) {
        return "GasCheck";
    }

    function moduleVersion() external pure returns (string memory) {
        return "0.0.1";
    }

    function beforeInitialize(IPoolManager, address, PoolKey calldata, uint160) external onlyAggregator {}

    function afterInitialize(IPoolManager, address, PoolKey calldata, uint160, int24) external onlyAggregator {}

    function beforeAddLiquidity(IPoolManager, address, PoolKey calldata, ModifyLiquidityParams calldata, bytes calldata)
        external
        onlyAggregator
    {}

    function afterAddLiquidity(
        IPoolManager,
        address,
        PoolKey calldata,
        ModifyLiquidityParams calldata,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external view onlyAggregator returns (IMODLModule.BalanceDeltaResult memory) {
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
    ) external view onlyAggregator returns (IMODLModule.BalanceDeltaResult memory) {
        return IMODLModule.BalanceDeltaResult({hasDelta: false, delta: BalanceDeltaLibrary.ZERO_DELTA});
    }

    function beforeSwap(IPoolManager, address, PoolKey calldata, SwapParams calldata, bytes calldata)
        external
        onlyAggregator
        returns (IMODLModule.BeforeSwapResult memory)
    {
        uint256 available = gasleft();
        if (available < minGas) revert GasTooLow(available, minGas);
        unchecked {
            ++successCount;
        }
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

    function beforeDonate(IPoolManager, address, PoolKey calldata, uint256, uint256, bytes calldata)
        external
        onlyAggregator
    {}

    function afterDonate(IPoolManager, address, PoolKey calldata, uint256, uint256, bytes calldata)
        external
        onlyAggregator
    {}
}

contract RoutingTestModule is IMODLModule {
    address public immutable aggregator;
    string public tag;
    uint256 public callCount;
    uint256 public lastOrderAmount;
    bytes32 public lastOrderId;

    error NotAggregator(address caller);

    modifier onlyAggregator() {
        if (msg.sender != aggregator) revert NotAggregator(msg.sender);
        _;
    }

    constructor(address aggregator_, string memory tag_) {
        aggregator = aggregator_;
        tag = tag_;
    }

    function moduleName() external view returns (string memory) {
        return tag;
    }

    function moduleVersion() external pure returns (string memory) {
        return "0.0.1";
    }

    function placeOrder(uint256 amount) external onlyAggregator returns (bytes32) {
        unchecked {
            ++callCount;
        }
        lastOrderAmount = amount;
        lastOrderId = keccak256(abi.encode(tag, amount, callCount));
        return lastOrderId;
    }

    function beforeInitialize(IPoolManager, address, PoolKey calldata, uint160) external onlyAggregator {}

    function afterInitialize(IPoolManager, address, PoolKey calldata, uint160, int24) external onlyAggregator {}

    function beforeAddLiquidity(IPoolManager, address, PoolKey calldata, ModifyLiquidityParams calldata, bytes calldata)
        external
        onlyAggregator
    {}

    function afterAddLiquidity(
        IPoolManager,
        address,
        PoolKey calldata,
        ModifyLiquidityParams calldata,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external view onlyAggregator returns (IMODLModule.BalanceDeltaResult memory) {
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
    ) external view onlyAggregator returns (IMODLModule.BalanceDeltaResult memory) {
        return IMODLModule.BalanceDeltaResult({hasDelta: false, delta: BalanceDeltaLibrary.ZERO_DELTA});
    }

    function beforeSwap(IPoolManager, address, PoolKey calldata, SwapParams calldata, bytes calldata)
        external
        onlyAggregator
        returns (IMODLModule.BeforeSwapResult memory)
    {
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

    function beforeDonate(IPoolManager, address, PoolKey calldata, uint256, uint256, bytes calldata)
        external
        onlyAggregator
    {}

    function afterDonate(IPoolManager, address, PoolKey calldata, uint256, uint256, bytes calldata)
        external
        onlyAggregator
    {}
}
