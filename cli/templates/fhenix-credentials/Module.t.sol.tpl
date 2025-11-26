// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {LPFeeLibrary} from "@uniswap/v4-core/src/libraries/LPFeeLibrary.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {{{MODULE_NAME}}, IFhenixCredentialVerifier} from "../../src/modules/{{MODULE_FILE_NAME}}.sol";

contract {{MODULE_NAME}}Test is Test {
    address internal constant AGGREGATOR = address(0xD1CE);
    {{MODULE_NAME}} internal module;
    MockVerifier internal verifier;
    PoolKey internal key;
    SwapParams internal params;
    address internal user = address(0xBEEF);

    function setUp() public {
        verifier = new MockVerifier();
        module = new {{MODULE_NAME}}(AGGREGATOR, address(verifier));
        key = _mockPoolKey();
        params = SwapParams({zeroForOne: true, amountSpecified: -1e18, sqrtPriceLimitX96: 0});
    }

    function testBlocksWithoutCredentials() public {
        vm.prank(AGGREGATOR);
        vm.expectRevert(abi.encodeWithSelector({{MODULE_NAME}}.AddressNotAuthorized.selector, user));
        module.beforeSwap(IPoolManager(address(0)), user, key, params, bytes(""));
    }

    function testAllowsWithVerifierApproval() public {
        bytes memory creds = abi.encode("opaque-proof");
        vm.prank(user);
        module.setEncryptedCredentials(creds);
        verifier.setAllowed(user, true);

        vm.prank(AGGREGATOR);
        module.beforeSwap(IPoolManager(address(0)), user, key, params, bytes(""));
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

contract MockVerifier is IFhenixCredentialVerifier {
    mapping(address => bool) public allowed;

    function setAllowed(address user, bool status) external {
        allowed[user] = status;
    }

    function isAllowed(address user, bytes calldata encryptedCreds) external view returns (bool) {
        if (encryptedCreds.length == 0) return false;
        return allowed[user];
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
