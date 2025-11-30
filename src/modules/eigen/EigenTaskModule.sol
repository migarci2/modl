// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IMODLModule} from "../../interfaces/IMODLModule.sol";

interface IEigenTaskManager {
    function postTask(bytes calldata payload) external returns (bytes32 taskId);
}

/**
 * @title EigenTaskModule
 * @notice Base helper for modules that dispatch async work to an EigenLayer AVS and handle callbacks.
 */
abstract contract EigenTaskModule is IMODLModule, Ownable {
    struct TaskContext {
        address user;
        bytes hookData;
    }

    IEigenTaskManager public eigenTaskManager;

    mapping(bytes32 => TaskContext) internal tasks;

    error UnknownTask(bytes32 taskId);
    error InvalidTaskManager(address taskManager);
    error UnauthorizedTaskFulfillment(address caller);

    event EigenTaskPosted(bytes32 indexed taskId, address indexed user, bytes payload);
    event EigenTaskFulfilled(bytes32 indexed taskId, bytes result);
    event EigenTaskManagerUpdated(address indexed taskManager);
    event EigenTaskFulfillmentAuthorizerUpdated(address indexed authorizer);

    address public authorizedFulfillment;

    constructor(address taskManager, address fulfillmentAuthorizer) Ownable(msg.sender) {
        if (taskManager == address(0)) revert InvalidTaskManager(address(0));
        if (fulfillmentAuthorizer == address(0)) revert UnauthorizedTaskFulfillment(address(0));
        eigenTaskManager = IEigenTaskManager(taskManager);
        authorizedFulfillment = fulfillmentAuthorizer;
    }

    function _postTask(bytes memory payload, address user, bytes memory hookData) internal returns (bytes32 taskId) {
        taskId = eigenTaskManager.postTask(payload);
        tasks[taskId] = TaskContext({user: user, hookData: hookData});
        emit EigenTaskPosted(taskId, user, payload);
    }

    function onTaskResult(bytes32 taskId, bytes calldata result) external {
        if (msg.sender != authorizedFulfillment) revert UnauthorizedTaskFulfillment(msg.sender);
        TaskContext memory ctx = tasks[taskId];
        if (ctx.user == address(0)) revert UnknownTask(taskId);

        _handleTaskResult(taskId, ctx, result);
        delete tasks[taskId];
        emit EigenTaskFulfilled(taskId, result);
    }

    function setTaskManager(address taskManager) external onlyOwner {
        if (taskManager == address(0)) revert InvalidTaskManager(address(0));
        eigenTaskManager = IEigenTaskManager(taskManager);
        emit EigenTaskManagerUpdated(taskManager);
    }

    function setTaskFulfillmentAuthorizer(address authorizer) external onlyOwner {
        if (authorizer == address(0)) revert UnauthorizedTaskFulfillment(address(0));
        authorizedFulfillment = authorizer;
        emit EigenTaskFulfillmentAuthorizerUpdated(authorizer);
    }

    function _handleTaskResult(bytes32 taskId, TaskContext memory ctx, bytes calldata result) internal virtual;
}
