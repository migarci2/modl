// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {DummyERC20} from "../utils/DummyERC20.sol";
import {WhitelistModule} from "../../src/modules/WhitelistModule.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";

contract WhitelistModuleTest is Test {
    address internal constant AGGREGATOR = address(0xA11CE);
    WhitelistModule internal module;
    PoolKey internal key;
    SwapParams internal params;

    function setUp() public {
        module = new WhitelistModule(AGGREGATOR);
        key = _mockPoolKey();
        params = SwapParams({zeroForOne: true, amountSpecified: -1e18, sqrtPriceLimitX96: 0});
    }

    function testNonAggregatorCantCall() public {
        vm.expectRevert(abi.encodeWithSelector(WhitelistModule.NotAggregator.selector, address(this)));
        module.beforeSwap(IPoolManager(address(0)), address(this), key, params, bytes(""));
    }

    function testBlocksUnknownAddress() public {
        vm.prank(AGGREGATOR);
        vm.expectRevert(abi.encodeWithSelector(WhitelistModule.AddressNotWhitelisted.selector, address(1)));
        module.beforeSwap(IPoolManager(address(0)), address(1), key, params, bytes(""));
    }

    function testAllowsWhitelistedAddress() public {
        module.setWhitelist(address(1), true);
        vm.prank(AGGREGATOR);
        module.beforeSwap(IPoolManager(address(0)), address(1), key, params, bytes(""));
    }

    function _mockPoolKey() private returns (PoolKey memory) {
        DummyERC20 tokenA = new DummyERC20("A", "A", 18);
        DummyERC20 tokenB = new DummyERC20("B", "B", 18);
        (address lower, address higher) =
            address(tokenA) < address(tokenB) ? (address(tokenA), address(tokenB)) : (address(tokenB), address(tokenA));
        return PoolKey({
            currency0: Currency.wrap(lower),
            currency1: Currency.wrap(higher),
            fee: 0,
            tickSpacing: 60,
            hooks: IHooks(address(0))
        });
    }
}
