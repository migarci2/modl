// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {FhenixCredentialsModule} from "@modl/core/src/modules/fhenix/FhenixCredentialsModule.sol";
import {IMODLModule} from "@modl/core/src/interfaces/IMODLModule.sol";
import {BalanceDelta, BalanceDeltaLibrary} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {ModifyLiquidityParams, SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";

/// @title {{MODULE_NAME}}
/// @notice Example credentials-gated module using Fhenix encrypted blobs and an external verifier.
contract {{MODULE_NAME}} is FhenixCredentialsModule, IMODLModule, Ownable {
    address public immutable AGGREGATOR;
    address public verifier;

    error NotAggregator(address caller);
    error VerifierNotSet();
    error AddressNotAuthorized(address account);

    event VerifierUpdated(address indexed verifier);

    modifier onlyAggregator() {
        if (msg.sender != AGGREGATOR) revert NotAggregator(msg.sender);
        _;
    }

    constructor(address aggregator_, address verifier_) Ownable(msg.sender) {
        if (aggregator_ == address(0)) revert NotAggregator(address(0));
        AGGREGATOR = aggregator_;
        verifier = verifier_;
        emit VerifierUpdated(verifier_);
    }

    function moduleName() external pure returns (string memory) {
        return "{{MODULE_NAME}}";
    }

    function moduleVersion() external pure returns (string memory) {
        return "0.0.1";
    }

    function setVerifier(address verifier_) external onlyOwner {
        verifier = verifier_;
        emit VerifierUpdated(verifier_);
    }

    function beforeInitialize(IPoolManager, address sender, PoolKey calldata, uint160) external onlyAggregator {
        _requireAllowed(sender);
    }

    function afterInitialize(IPoolManager, address sender, PoolKey calldata, uint160, int24) external onlyAggregator {
        _requireAllowed(sender);
    }

    function beforeAddLiquidity(
        IPoolManager,
        address sender,
        PoolKey calldata,
        ModifyLiquidityParams calldata,
        bytes calldata
    ) external onlyAggregator {
        _requireAllowed(sender);
    }

    function afterAddLiquidity(
        IPoolManager,
        address,
        PoolKey calldata,
        ModifyLiquidityParams calldata,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external onlyAggregator returns (IMODLModule.BalanceDeltaResult memory) {
        return IMODLModule.BalanceDeltaResult({hasDelta: false, delta: BalanceDeltaLibrary.ZERO_DELTA});
    }

    function beforeRemoveLiquidity(
        IPoolManager,
        address sender,
        PoolKey calldata,
        ModifyLiquidityParams calldata,
        bytes calldata
    ) external onlyAggregator {
        _requireAllowed(sender);
    }

    function afterRemoveLiquidity(
        IPoolManager,
        address,
        PoolKey calldata,
        ModifyLiquidityParams calldata,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external onlyAggregator returns (IMODLModule.BalanceDeltaResult memory) {
        return IMODLModule.BalanceDeltaResult({hasDelta: false, delta: BalanceDeltaLibrary.ZERO_DELTA});
    }

    function beforeSwap(IPoolManager, address sender, PoolKey calldata, SwapParams calldata, bytes calldata)
        external
        onlyAggregator
        returns (IMODLModule.BeforeSwapResult memory)
    {
        _requireAllowed(sender);
        return
            IMODLModule.BeforeSwapResult({hasDelta: false, delta: BeforeSwapDelta.wrap(0), hasNewFee: false, newFee: 0});
    }

    function afterSwap(IPoolManager, address sender, PoolKey calldata, SwapParams calldata, BalanceDelta, bytes calldata)
        external
        onlyAggregator
        returns (IMODLModule.AfterSwapResult memory)
    {
        _requireAllowed(sender);
        return IMODLModule.AfterSwapResult({hasDelta: false, delta: 0});
    }

    function beforeDonate(IPoolManager, address sender, PoolKey calldata, uint256, uint256, bytes calldata)
        external
        onlyAggregator
    {
        _requireAllowed(sender);
    }

    function afterDonate(IPoolManager, address sender, PoolKey calldata, uint256, uint256, bytes calldata)
        external
        onlyAggregator
    {
        _requireAllowed(sender);
    }

    function _checkAllowed(address user) internal view override returns (bool) {
        if (verifier == address(0)) revert VerifierNotSet();
        if (encryptedCreds[user].length == 0) return false;
        return IFhenixCredentialVerifier(verifier).isAllowed(user, encryptedCreds[user]);
    }

    function _requireAllowed(address user) private view {
        if (!_checkAllowed(user)) revert AddressNotAuthorized(user);
    }
}

interface IFhenixCredentialVerifier {
    function isAllowed(address user, bytes calldata encryptedCreds) external view returns (bool);
}
