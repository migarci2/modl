// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {IFhenixCredentialVerifier} from "../../src/modules/fhenix/FhenixWhitelistModule.sol";

contract MockFhenixCredentialVerifier is IFhenixCredentialVerifier {
    mapping(address => bool) public allowed;

    function setAllowed(address user, bool status) external {
        allowed[user] = status;
    }

    function isAllowed(address user, bytes calldata encryptedCreds) external view returns (bool) {
        // Treat missing credentials as invalid to mimic an FHE proof requirement.
        if (encryptedCreds.length == 0) return false;
        return allowed[user];
    }
}
