---
id: advanced-gas-performance
title: Gas & Performance
description: Tune per-module gas limits, order modules, and benchmark heavy logic.
---

## How gas limits work

Every `ModuleConfigInput` includes `gasLimit`. During execution the aggregator wraps every call with that limit:

```solidity
(bool ok, bytes memory ret) = config.module.call{gas: config.gasLimit}(payload);
```

- `gasLimit = 0` means "use whatever gas remains".
- If a module exhausts its allowance and `critical = true`, the entire hook reverts.
- If `critical = false`, the aggregator emits `ModuleExecutionSkipped` and continues to the next module.

## Patterns

| Module type          | Suggested gas limit | Critical? | Notes |
| -------------------- | ------------------- | --------- | ----- |
| Stateless policies   | 20k–40k             | Usually   | Mapping lookups, cheap branching. |
| Logging / analytics  | 15k–30k             | No        | Non-critical data capture. |
| Fee controllers      | 40k–80k             | Yes       | Often decode hook data, adjust LP fees. |
| Limit orders / MEV   | 120k+               | Mixed     | Dependent on tick scans and ERC1155 ops. |

Keep `_modules.length` small (≤5) to minimize per-hook iteration overhead.

## Measuring modules

Use Foundry's gas report to benchmark:

```bash
forge test --match-contract DynamicFeeModuleTest --gas-report
```

This surfaces the cost of each hook function so you can set realistic limits. For heavy modules, split "read and check" logic (before hooks) from "write and settle" logic (after hooks) to better control variance.

## Example: best-effort analytics

```solidity
configs.push(MODLAggregator.ModuleConfigInput({
    module: analyticsModule,
    hooks: hooks,
    critical: false,
    priority: 50,
    gasLimit: 25_000
}));
```

If the module reverts, swaps still complete and the protocol emits `ModuleExecutionSkipped` with the revert reason. This pattern lets you experiment without endangering core functionality.

## Example: defending against griefing

Set a tight limit for untrusted modules:

```solidity
configs[i].gasLimit = 60_000;
configs[i].critical = true;
```

If a third-party module surges in cost (e.g., due to expensive storage writes), it simply reverts without draining the aggregator's remaining gas or bricking the pool.
