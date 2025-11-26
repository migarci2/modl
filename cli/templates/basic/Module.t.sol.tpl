// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {LPFeeLibrary} from "@uniswap/v4-core/src/libraries/LPFeeLibrary.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {{{MODULE_NAME}}} from "../../src/modules/{{MODULE_FILE_NAME}}.sol";

contract {{MODULE_NAME}}Test is Test {
    address internal constant AGGREGATOR = address(0xD1CE);
    {{MODULE_NAME}} internal module;
    PoolKey internal key;
    SwapParams internal params;

    function setUp() public {
        module = new {{MODULE_NAME}}(AGGREGATOR);
        key = _mockPoolKey();
        params = SwapParams({zeroForOne: true, amountSpecified: -1e18, sqrtPriceLimitX96: 0});
    }

    function testAggregatorIsSet() public {
        assertEq(module.AGGREGATOR(), AGGREGATOR);
    }

    function testNonAggregatorCannotCall() public {
        vm.expectRevert(abi.encodeWithSelector({{MODULE_NAME}}.NotAggregator.selector, address(this)));
        module.beforeSwap(IPoolManager(address(0)), address(this), key, params, bytes(""));
    }

    function _mockPoolKey() private returns (PoolKey memory) {
        DummyToken tokenA = new DummyToken("A");
        DummyToken tokenB = new DummyToken("B");
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

contract DummyToken {
    string public name;
    string public symbol;
    uint8 public immutable decimals = 18;

    constructor(string memory symbol_) {
        name = symbol_;
        symbol = symbol_;
    }
}
