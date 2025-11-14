// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {DummyERC20} from "../utils/DummyERC20.sol";
import {DynamicFeeModule} from "../../src/modules/DynamicFeeModule.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {LPFeeLibrary} from "@uniswap/v4-core/src/libraries/LPFeeLibrary.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {IMODLModule} from "../../src/interfaces/IMODLModule.sol";

contract DynamicFeeModuleTest is Test {
    address internal constant AGGREGATOR = address(0xD1CE);
    DynamicFeeModule internal module;
    PoolKey internal key;
    SwapParams internal params;

    function setUp() public {
        module = new DynamicFeeModule(AGGREGATOR, 300, 1000, 400, 200);
        key = _mockPoolKey();
        params = SwapParams({zeroForOne: true, amountSpecified: -1e18, sqrtPriceLimitX96: 0});
    }

    function testVolatilityFeedsFee() public {
        module.setVolatilityIndex(5000); // adds 100 bps (5000 * 200 / 1e4)

        vm.prank(AGGREGATOR);
        IMODLModule.BeforeSwapResult memory res =
            module.beforeSwap(IPoolManager(address(0)), address(1), key, params, bytes(""));
        uint24 unflagged = LPFeeLibrary.removeOverrideFlag(res.newFee);
        assertEq(unflagged, 500);
    }

    function testHookDataCustomFee() public {
        DynamicFeeModule.SwapFeeInstruction memory instruction =
            DynamicFeeModule.SwapFeeInstruction({useCustomFee: true, customFee: 750});
        vm.prank(AGGREGATOR);
        IMODLModule.BeforeSwapResult memory res =
            module.beforeSwap(IPoolManager(address(0)), address(1), key, params, abi.encode(instruction));
        uint24 unflagged = LPFeeLibrary.removeOverrideFlag(res.newFee);
        assertEq(unflagged, instruction.customFee);
    }

    function testCustomFeeClampedToBounds() public {
        DynamicFeeModule.SwapFeeInstruction memory instruction =
            DynamicFeeModule.SwapFeeInstruction({useCustomFee: true, customFee: 5000});
        vm.prank(AGGREGATOR);
        IMODLModule.BeforeSwapResult memory res =
            module.beforeSwap(IPoolManager(address(0)), address(1), key, params, abi.encode(instruction));
        uint24 unflagged = LPFeeLibrary.removeOverrideFlag(res.newFee);
        assertEq(unflagged, module.maxFee());
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
