---
id: writing-modules
title: Writing Modules
description: Build policy modules, stateful guards, and expose extra APIs.
---

MODL modules are standard Solidity contracts that implement `IMODLModule`. Each module is deployed once, keeps its own storage, and is invoked only by the aggregator. Below are two progressively richer examples.

## Simple example: LoggingModule

This policy module emits an event for every swap. It is stateless, low-gas, and safe to mark as non-critical if you do not want logging failures to revert swaps.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IMODLModule} from "modl/src/interfaces/IMODLModule.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";

contract LoggingModule is IMODLModule {
    address public immutable aggregator;

    event SwapSeen(address indexed sender, PoolKey key, bool zeroForOne, int256 amountSpecified);

    error NotAggregator(address caller);

    constructor(address aggregator_) {
        aggregator = aggregator_;
    }

    modifier onlyAggregator() {
        if (msg.sender != aggregator) revert NotAggregator(msg.sender);
        _;
    }

    function beforeSwap(
        IPoolManager,
        address sender,
        PoolKey calldata key,
        SwapParams calldata params,
        bytes calldata
    ) external onlyAggregator returns (IMODLModule.BeforeSwapResult memory) {
        emit SwapSeen(sender, key, params.zeroForOne, params.amountSpecified);
        return IMODLModule.BeforeSwapResult({
            hasDelta: false,
            delta: BeforeSwapDelta.wrap(0),
            hasNewFee: false,
            newFee: 0
        });
    }

    // other hooks default to no-op by returning zeroed structs
}
```

Register it:

```solidity
MODLAggregator.ModuleHooks memory hooks;
hooks.beforeSwap = true;

configs[i] = MODLAggregator.ModuleConfigInput({
    module: loggingModule,
    hooks: hooks,
    critical: false,
    priority: 1,
    gasLimit: 20_000
});
```

Result: every swap emits `SwapSeen` while swaps continue even if logging fails.

## Stateful example: WhitelistModule

WhitelistModule enforces access control on swaps and liquidity updates. Because it protects the pool, mark it as `critical = true`.

```solidity
pragma solidity ^0.8.24;

import {IMODLModule} from "modl/src/interfaces/IMODLModule.sol";

contract WhitelistModule is IMODLModule {
    address public owner;
    mapping(address => bool) public isWhitelisted;

    error NotOwner();
    error NotWhitelisted(address sender);

    constructor(address aggregator_) {
        owner = msg.sender;
        aggregator = aggregator_;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function setWhitelisted(address user, bool allowed) external onlyOwner {
        isWhitelisted[user] = allowed;
    }

    function beforeSwap(
        IPoolManager,
        address sender,
        PoolKey calldata,
        SwapParams calldata,
        bytes calldata
    ) external onlyAggregator returns (IMODLModule.BeforeSwapResult memory) {
        if (!isWhitelisted[sender]) revert NotWhitelisted(sender);
        return IMODLModule.BeforeSwapResult({
            hasDelta: false,
            delta: BeforeSwapDelta.wrap(0),
            hasNewFee: false,
            newFee: 0
        });
    }
}
```

Registration is identical to the logging example, but with `critical: true` and a higher gas limit (enough to cover storage lookups).

### End-to-end authoring flow

1. **Prototype** – Implement the module locally and write Foundry tests that call the hook functions directly.
2. **Install** – Deploy the module and pass its address into the aggregator via `setModules`.
3. **Configure** – If the module needs owner-only actions, transfer ownership to the aggregator or a dedicated admin.
4. **Validate** – Run integration tests (see [Testing & Tooling](testing-tooling.md)) to ensure the aggregator invokes the module correctly.
5. **Ship** – Include the module in your production module list.

By repeating this pattern you can add as many policy or analytics modules as needed without rewriting the hook.
