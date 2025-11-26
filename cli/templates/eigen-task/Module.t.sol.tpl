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
import {IEigenTaskManager} from "@modl/core/src/modules/eigen/EigenTaskModule.sol";

contract {{MODULE_NAME}}Test is Test {
    address internal constant AGGREGATOR = address(0xD1CE);
    {{MODULE_NAME}} internal module;
    MockTaskManager internal manager;
    PoolKey internal key;
    SwapParams internal params;

    function setUp() public {
        manager = new MockTaskManager();
        module = new {{MODULE_NAME}}(AGGREGATOR, address(manager), address(this));
        key = _mockPoolKey();
        params = SwapParams({zeroForOne: true, amountSpecified: -1e18, sqrtPriceLimitX96: 0});
    }

    function testPostsTaskOnBeforeSwap() public {
        bytes memory payload = abi.encode("hook-data");
        vm.prank(AGGREGATOR);
        module.beforeSwap(IPoolManager(address(0)), address(1), key, params, payload);
        assertEq(manager.lastPayload(), payload);
        assertEq(manager.lastTaskId(), bytes32(uint256(1)));
    }

    function testFulfillmentEmitsEvent() public {
        bytes memory payload = abi.encode("hook-data");
        vm.prank(AGGREGATOR);
        module.beforeSwap(IPoolManager(address(0)), address(this), key, params, payload);

        vm.expectEmit(true, true, true, true);
        emit {{MODULE_NAME}}.EigenTaskResult(bytes32(uint256(1)), address(this), payload, abi.encode("result"));
        module.onTaskResult(bytes32(uint256(1)), abi.encode("result"));
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

contract MockTaskManager is IEigenTaskManager {
    bytes32 public lastTaskId;
    bytes public lastPayload;

    function postTask(bytes calldata payload) external returns (bytes32 taskId) {
        lastPayload = payload;
        lastTaskId = bytes32(uint256(lastTaskId) + 1);
        return lastTaskId;
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
