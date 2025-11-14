---
id: security
title: Security Considerations
description: Threat model and best practices when composing modules behind one hook.
---

## Aggregator ownership

- Keep the aggregator owner on a multisig or timelock. `setModules`, `setRoute`, and `clearRoute` are powerful operations.
- Treat module registration like deploying a new hook—review gas usage, reentrancy, and storage layout every time.

## Module trust levels

- **Critical modules** should be audited; they can revert the entire hook.
- **Non-critical modules** should still validate inputs because they can emit misleading events or waste gas.
- Avoid calling into untrusted external contracts from modules, or wrap them with circuit breakers.

```solidity
modifier onlyAggregator() {
    if (msg.sender != aggregator) revert NotAggregator(msg.sender);
    _;
}
```

## Fallback routing

- Routes share the same `msg.sender` (`external user`). Validate permissions inside the module.
- Clear routes when removing modules to avoid old selectors pointing to unrelated logic.

## Hook data validation

- Hook data is arbitrary bytes supplied by pool callers. Modules must decode defensively and revert on malformed payloads.
- Prefer simple structs with explicit lengths to avoid out-of-bounds reads.

## Gas griefing

- Measure modules thoroughly and set realistic `gasLimit` values. Too-high limits defeat the purpose; too-low limits can cause accidental reverts.
- Place heavy modules later in the priority list so essential guards execute first even if later modules revert.

## Upgrades & migrations

- Keep historical configs (e.g., emit events when calling `setModules`).
- When migrating modules, configure them off-chain first, then batch register and route in one transaction to minimize inconsistent states.

### Security hardening flow

1. Deploy new modules to a staging environment and run `forge test --gas-report` to capture costs.
2. Review bytecode + storage diffs, then prepare a single multisig transaction calling `setModules` followed by the necessary `setRoute` calls.
3. After execution, call `getModules()` and `routes(selector)` to verify on-chain configuration, then publish a changelog so integrators know about the new behavior.

Security is a shared responsibility: the aggregator ensures deterministic dispatch, but each module must enforce its own invariants.
