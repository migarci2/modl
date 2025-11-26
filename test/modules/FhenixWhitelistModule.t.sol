// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {FhenixWhitelistModule} from "../../src/modules/fhenix/FhenixWhitelistModule.sol";
import {MockFhenixCredentialVerifier} from "../mocks/MockFhenixCredentialVerifier.sol";
import {DummyERC20} from "../utils/DummyERC20.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {LPFeeLibrary} from "@uniswap/v4-core/src/libraries/LPFeeLibrary.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {IMODLModule} from "../../src/interfaces/IMODLModule.sol";

contract FhenixWhitelistModuleTest is Test {
    address internal constant AGGREGATOR = address(0xD1CE);
    FhenixWhitelistModule internal module;
    MockFhenixCredentialVerifier internal verifier;
    PoolKey internal key;
    SwapParams internal params;
    address internal user = address(0xBEEF);

    function setUp() public {
        verifier = new MockFhenixCredentialVerifier();
        module = new FhenixWhitelistModule(AGGREGATOR, address(verifier));
        key = _mockPoolKey();
        params = SwapParams({zeroForOne: true, amountSpecified: -1e18, sqrtPriceLimitX96: 0});
    }

    function testBlocksSwapWithoutCredentials() public {
        vm.expectRevert(abi.encodeWithSelector(FhenixWhitelistModule.AddressNotAuthorized.selector, user));
        vm.prank(AGGREGATOR);
        module.beforeSwap(IPoolManager(address(0)), user, key, params, bytes(""));
    }

    function testAllowsSwapWithValidCredentials() public {
        bytes memory creds = abi.encode("opaque-fhe-proof");
        vm.prank(user);
        module.setEncryptedCredentials(creds);
        verifier.setAllowed(user, true);

        vm.prank(AGGREGATOR);
        IMODLModule.BeforeSwapResult memory res =
            module.beforeSwap(IPoolManager(address(0)), user, key, params, bytes(""));
        assertFalse(res.hasDelta);
    }

    function testEnforcementCanBeDisabled() public {
        module.setEnforcement(false, false, false);

        vm.prank(AGGREGATOR);
        IMODLModule.BeforeSwapResult memory res =
            module.beforeSwap(IPoolManager(address(0)), user, key, params, bytes(""));
        assertFalse(res.hasDelta);
    }

    function testRequiresAggregatorCaller() public {
        vm.expectRevert(abi.encodeWithSelector(FhenixWhitelistModule.NotAggregator.selector, address(this)));
        module.beforeSwap(IPoolManager(address(0)), user, key, params, bytes(""));
    }

    function testRevertsWhenVerifierUnset() public {
        module.setVerifier(address(0));
        vm.expectRevert(FhenixWhitelistModule.VerifierNotSet.selector);
        vm.prank(AGGREGATOR);
        module.beforeSwap(IPoolManager(address(0)), user, key, params, bytes(""));
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
