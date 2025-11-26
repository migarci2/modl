// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {EigenDynamicFeeModule} from "../../src/modules/eigen/EigenDynamicFeeModule.sol";
import {EigenOracleModule} from "../../src/modules/eigen/EigenOracleModule.sol";
import {MockEigenOracle} from "../mocks/MockEigenOracle.sol";
import {DummyERC20} from "../utils/DummyERC20.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {LPFeeLibrary} from "@uniswap/v4-core/src/libraries/LPFeeLibrary.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {IMODLModule} from "../../src/interfaces/IMODLModule.sol";

contract EigenDynamicFeeModuleTest is Test {
    address internal constant AGGREGATOR = address(0xD1CE);
    EigenDynamicFeeModule internal module;
    MockEigenOracle internal oracle;
    PoolKey internal key;
    SwapParams internal params;

    function setUp() public {
        oracle = new MockEigenOracle();
        oracle.setValue(5000, block.timestamp);
        module = new EigenDynamicFeeModule(AGGREGATOR, address(oracle), 1 days, 300, 1000, 400, 200);
        key = _mockPoolKey();
        params = SwapParams({zeroForOne: true, amountSpecified: -1e18, sqrtPriceLimitX96: 0});
    }

    function testVolatilityFromEigenOracleFeedsFee() public {
        vm.prank(AGGREGATOR);
        IMODLModule.BeforeSwapResult memory res =
            module.beforeSwap(IPoolManager(address(0)), address(1), key, params, bytes(""));

        uint24 unflagged = LPFeeLibrary.removeOverrideFlag(res.newFee);
        assertEq(unflagged, 500); // 400 base + (5000 * 200 / 1e4)
    }

    function testCustomFeeInstructionClamped() public {
        EigenDynamicFeeModule.SwapFeeInstruction memory instruction =
            EigenDynamicFeeModule.SwapFeeInstruction({useCustomFee: true, customFee: 5000});

        vm.prank(AGGREGATOR);
        IMODLModule.BeforeSwapResult memory res =
            module.beforeSwap(IPoolManager(address(0)), address(1), key, params, abi.encode(instruction));

        uint24 unflagged = LPFeeLibrary.removeOverrideFlag(res.newFee);
        assertEq(unflagged, module.maxFee());
    }

    function testRevertsWhenOracleStale() public {
        vm.warp(block.timestamp + 3 days);
        oracle.setValue(7000, block.timestamp - 2 days);
        vm.expectRevert(
            abi.encodeWithSelector(
                EigenOracleModule.EigenOracleStale.selector, oracle.updatedAt(), block.timestamp, module.maxStaleness()
            )
        );
        vm.prank(AGGREGATOR);
        module.beforeSwap(IPoolManager(address(0)), address(1), key, params, bytes(""));
    }

    function testOnlyAggregatorCanCallHook() public {
        vm.expectRevert(abi.encodeWithSelector(EigenDynamicFeeModule.NotAggregator.selector, address(this)));
        module.beforeSwap(IPoolManager(address(0)), address(this), key, params, bytes(""));
    }

    function _mockPoolKey() private returns (PoolKey memory) {
        DummyERC20 tokenA = new DummyERC20("A", "A", 18);
        DummyERC20 tokenB = new DummyERC20("B", "B", 18);
        (address lower, address higher) =
            address(tokenA) < address(tokenB) ? (address(tokenA), address(tokenB)) : (address(tokenB), address(tokenA));
        return PoolKey({
            currency0: Currency.wrap(lower),
            currency1: Currency.wrap(higher),
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: 60,
            hooks: IHooks(address(0))
        });
    }
}
