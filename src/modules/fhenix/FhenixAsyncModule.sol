// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @dev Arbitrary interface expected to be implemented by the Fhenix co-processor / relayer.
interface IFheComputationManager {
    function requestComputation(bytes calldata payload) external returns (uint256 taskId);
}

/**
 * @title FhenixAsyncModule
 * @notice Base helper for modules that outsource private computation to a Fhenix co-processor.
 * @dev Keeps minimal state: task contexts and a single fulfillment entrypoint. The actual hook
 *      logic is delegated to `_handleFheResult`.
 */
abstract contract FhenixAsyncModule is Ownable {
    struct FheTaskContext {
        address user;
        bytes hookData;
        bytes32 hookType;
    }

    mapping(uint256 => FheTaskContext) internal fheTasks;

    IFheComputationManager public fheManager;
    address public authorizedFulfillment;

    error UnknownTask(uint256 taskId);
    error UnauthorizedFulfillment(address caller);
    error InvalidManager(address manager);

    event FheTaskRequested(uint256 indexed taskId, address indexed user, bytes32 hookType, bytes payload);
    event FheTaskFulfilled(uint256 indexed taskId, bytes result);
    event FheManagerUpdated(address indexed manager);
    event FulfillmentAuthorizerUpdated(address indexed authorizer);

    constructor(address manager, address fulfillmentAuthorizer) Ownable(msg.sender) {
        if (manager == address(0)) revert InvalidManager(address(0));
        if (fulfillmentAuthorizer == address(0)) revert UnauthorizedFulfillment(address(0));
        fheManager = IFheComputationManager(manager);
        authorizedFulfillment = fulfillmentAuthorizer;
    }

    /**
     * @notice Submit a computation request to the Fhenix manager and persist the context.
     * @dev `hookType` lets inheriting modules distinguish which hook originated the request.
     */
    function _requestFhe(bytes memory payload, bytes32 hookType, address user, bytes memory hookData)
        internal
        returns (uint256 taskId)
    {
        taskId = fheManager.requestComputation(payload);
        fheTasks[taskId] = FheTaskContext({user: user, hookData: hookData, hookType: hookType});
        emit FheTaskRequested(taskId, user, hookType, payload);
    }

    /**
     * @notice Entry point called by the Fhenix relayer when a computation completes.
     * @dev Inheriting modules should implement `_handleFheResult` to act on the decrypted payload.
     */
    function onFheResult(uint256 taskId, bytes calldata result) external {
        if (msg.sender != authorizedFulfillment) revert UnauthorizedFulfillment(msg.sender);
        FheTaskContext memory ctx = fheTasks[taskId];
        if (ctx.user == address(0)) revert UnknownTask(taskId);

        _handleFheResult(taskId, ctx, result);
        delete fheTasks[taskId];
        emit FheTaskFulfilled(taskId, result);
    }

    function setFheManager(address manager) external onlyOwner {
        if (manager == address(0)) revert InvalidManager(address(0));
        fheManager = IFheComputationManager(manager);
        emit FheManagerUpdated(manager);
    }

    function setFulfillmentAuthorizer(address authorizer) external onlyOwner {
        if (authorizer == address(0)) revert UnauthorizedFulfillment(address(0));
        authorizedFulfillment = authorizer;
        emit FulfillmentAuthorizerUpdated(authorizer);
    }

    function _handleFheResult(uint256 taskId, FheTaskContext memory ctx, bytes calldata result) internal virtual;
}
