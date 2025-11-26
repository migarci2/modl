// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {IMODLModule} from "../../interfaces/IMODLModule.sol";

/**
 * @title FhenixCredentialsModule
 * @notice Base helper for modules that gate actions using encrypted credentials managed off-chain.
 * @dev Stores opaque credential blobs per user and exposes a single virtual check hook that concrete
 *      modules can implement using FHE / external verifiers.
 */
abstract contract FhenixCredentialsModule is IMODLModule {
    mapping(address => bytes) internal encryptedCreds;

    event CredentialsSet(address indexed account, bytes data);

    /**
     * @notice Persist encrypted credentials for msg.sender.
     * @dev Leaves the validation strategy to the inheriting contract.
     */
    function setEncryptedCredentials(bytes calldata data) external {
        encryptedCreds[msg.sender] = data;
        emit CredentialsSet(msg.sender, data);
    }

    /**
     * @notice Returns true if the user is allowed to interact given their encrypted credentials.
     * @dev Implementations decide how to evaluate the ciphertext (e.g. off-chain FHE, on-chain ZK).
     */
    function _checkAllowed(address user) internal view virtual returns (bool);
}
