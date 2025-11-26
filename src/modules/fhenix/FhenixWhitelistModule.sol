// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {FhenixCredentialsModule} from "./FhenixCredentialsModule.sol";
import {IMODLModule} from "../../interfaces/IMODLModule.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {BalanceDelta, BalanceDeltaLibrary} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {ModifyLiquidityParams, SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";

interface IFhenixCredentialVerifier {
    function isAllowed(address user, bytes calldata encryptedCreds) external view returns (bool);
}

/**
 * @title FhenixWhitelistModule
 * @notice Example allow-list that defers credential validation to an off-chain Fhenix verifier.
 */
contract FhenixWhitelistModule is FhenixCredentialsModule, Ownable {
    address public immutable AGGREGATOR;

    IFhenixCredentialVerifier public verifier;

    bool public enforceLiquidity = true;
    bool public enforceSwaps = true;
    bool public enforceDonations = true;

    error NotAggregator(address caller);
    error VerifierNotSet();
    error AddressNotAuthorized(address account);

    event EnforcementUpdated(bool liquidity, bool swaps, bool donations);
    event VerifierUpdated(address indexed verifier);

    modifier onlyAggregator() {
        if (msg.sender != AGGREGATOR) revert NotAggregator(msg.sender);
        _;
    }

    constructor(address aggregator_, address verifier_) Ownable(msg.sender) {
        if (aggregator_ == address(0)) revert NotAggregator(address(0));
        AGGREGATOR = aggregator_;
        verifier = IFhenixCredentialVerifier(verifier_);
        if (verifier_ != address(0)) {
            emit VerifierUpdated(verifier_);
        }
    }

    function moduleName() external pure returns (string memory) {
        return "FhenixWhitelist";
    }

    function moduleVersion() external pure returns (string memory) {
        return "0.1.0";
    }

    function setVerifier(address verifier_) external onlyOwner {
        verifier = IFhenixCredentialVerifier(verifier_);
        emit VerifierUpdated(verifier_);
    }

    function setEnforcement(bool liquidity, bool swaps, bool donations) external onlyOwner {
        enforceLiquidity = liquidity;
        enforceSwaps = swaps;
        enforceDonations = donations;
        emit EnforcementUpdated(liquidity, swaps, donations);
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
        if (enforceLiquidity) _requireAllowed(sender);
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
        if (enforceLiquidity) _requireAllowed(sender);
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
        if (enforceSwaps) _requireAllowed(sender);
        return
            IMODLModule.BeforeSwapResult({hasDelta: false, delta: BeforeSwapDelta.wrap(0), hasNewFee: false, newFee: 0});
    }

    function afterSwap(
        IPoolManager,
        address sender,
        PoolKey calldata,
        SwapParams calldata,
        BalanceDelta,
        bytes calldata
    ) external onlyAggregator returns (IMODLModule.AfterSwapResult memory) {
        if (enforceSwaps) _requireAllowed(sender);
        return IMODLModule.AfterSwapResult({hasDelta: false, delta: 0});
    }

    function beforeDonate(IPoolManager, address sender, PoolKey calldata, uint256, uint256, bytes calldata)
        external
        onlyAggregator
    {
        if (enforceDonations) _requireAllowed(sender);
    }

    function afterDonate(IPoolManager, address sender, PoolKey calldata, uint256, uint256, bytes calldata)
        external
        onlyAggregator
    {
        if (enforceDonations) _requireAllowed(sender);
    }

    function _checkAllowed(address user) internal view override returns (bool) {
        if (address(verifier) == address(0)) revert VerifierNotSet();
        bytes memory creds = encryptedCreds[user];
        return verifier.isAllowed(user, creds);
    }

    function _requireAllowed(address user) private view {
        if (!_checkAllowed(user)) revert AddressNotAuthorized(user);
    }
}
