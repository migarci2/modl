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
import {IEigenOracle} from "@modl/core/src/modules/eigen/EigenOracleModule.sol";

contract {{MODULE_NAME}}Test is Test {
    address internal constant AGGREGATOR = address(0xD1CE);
    {{MODULE_NAME}} internal module;
    MockOracle internal oracle;
    PoolKey internal key;
    SwapParams internal params;

    function setUp() public {
        oracle = new MockOracle();
        oracle.setValue(5000, block.timestamp);
        module = new {{MODULE_NAME}}(AGGREGATOR, address(oracle), 1 days);
        key = _mockPoolKey();
        params = SwapParams({zeroForOne: true, amountSpecified: -1e18, sqrtPriceLimitX96: 0});
    }

    function testUsesOracleValue() public {
        vm.prank(AGGREGATOR);
        (, , uint24 feeOverride) = module.beforeSwap(IPoolManager(address(0)), address(this), key, params, bytes(""));
        uint24 unflagged = LPFeeLibrary.removeOverrideFlag(feeOverride);
        assertGt(unflagged, module.baseFeeBps());
    }

    function testRevertsWhenStale() public {
        oracle.setValue(6000, block.timestamp - 2 days);
        vm.expectRevert();
        vm.prank(AGGREGATOR);
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

contract MockOracle is IEigenOracle {
    uint256 public value;
    uint256 public updatedAt;

    function setValue(uint256 value_, uint256 updatedAt_) external {
        value = value_;
        updatedAt = updatedAt_;
    }

    function latest() external view returns (uint256, uint256) {
        return (value, updatedAt);
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
