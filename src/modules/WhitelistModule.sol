// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {BalanceDelta, BalanceDeltaLibrary} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {ModifyLiquidityParams, SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {IMODLModule} from "../interfaces/IMODLModule.sol";

/**
 * @title WhitelistModule
 * @notice Simple allow-list gate that can be enabled for swaps, liquidity updates and donations.
 * @dev Gas optimized with packed storage and unchecked loops.
 */
contract WhitelistModule is IMODLModule, Ownable {
    address public immutable AGGREGATOR;

    mapping(address => bool) public isAllowed;

    /// @dev Packed into single storage slot (3 bools = 3 bytes)
    bool public enforceLiquidity = true;
    bool public enforceSwaps = true;
    bool public enforceDonations = true;

    error NotAggregator(address caller);
    error AddressNotWhitelisted(address account);

    event WhitelistUpdated(address indexed account, bool allowed);
    event EnforcementUpdated(bool liquidity, bool swaps, bool donations);

    modifier onlyAggregator() {
        if (msg.sender != AGGREGATOR) revert NotAggregator(msg.sender);
        _;
    }

    constructor(address aggregator_) Ownable(msg.sender) {
        if (aggregator_ == address(0)) revert NotAggregator(address(0));
        AGGREGATOR = aggregator_;
    }

    function moduleName() external pure returns (string memory) {
        return "Whitelist";
    }

    function moduleVersion() external pure returns (string memory) {
        return "1.0.0";
    }

    function setWhitelist(address account, bool allowed) external onlyOwner {
        isAllowed[account] = allowed;
        emit WhitelistUpdated(account, allowed);
    }

    /// @dev Optimized batch whitelist with unchecked loop
    function setBatchWhitelist(address[] calldata accounts, bool allowed) external onlyOwner {
        uint256 length = accounts.length;
        for (uint256 i; i < length;) {
            isAllowed[accounts[i]] = allowed;
            emit WhitelistUpdated(accounts[i], allowed);
            unchecked {
                ++i;
            }
        }
    }

    function setEnforcement(bool liquidity, bool swaps, bool donations) external onlyOwner {
        enforceLiquidity = liquidity;
        enforceSwaps = swaps;
        enforceDonations = donations;
        emit EnforcementUpdated(liquidity, swaps, donations);
    }

    function beforeInitialize(IPoolManager, address sender, PoolKey calldata, uint160) external onlyAggregator {
        _requireWhitelisted(sender);
    }

    function afterInitialize(IPoolManager, address sender, PoolKey calldata, uint160, int24) external onlyAggregator {
        _requireWhitelisted(sender);
    }

    function beforeAddLiquidity(
        IPoolManager,
        address sender,
        PoolKey calldata,
        ModifyLiquidityParams calldata,
        bytes calldata
    ) external onlyAggregator {
        if (enforceLiquidity) _requireWhitelisted(sender);
    }

    /// @dev Returns empty delta - no token adjustments
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
        if (enforceLiquidity) _requireWhitelisted(sender);
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
        if (enforceSwaps) _requireWhitelisted(sender);
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
        if (enforceSwaps) _requireWhitelisted(sender);
        return IMODLModule.AfterSwapResult({hasDelta: false, delta: 0});
    }

    function beforeDonate(IPoolManager, address sender, PoolKey calldata, uint256, uint256, bytes calldata)
        external
        onlyAggregator
    {
        if (enforceDonations) _requireWhitelisted(sender);
    }

    function afterDonate(IPoolManager, address sender, PoolKey calldata, uint256, uint256, bytes calldata)
        external
        onlyAggregator
    {
        if (enforceDonations) _requireWhitelisted(sender);
    }

    function _requireWhitelisted(address account) private view {
        if (!isAllowed[account]) revert AddressNotWhitelisted(account);
    }
}
