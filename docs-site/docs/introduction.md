---
id: introduction
slug: /
title: Introduction
description: What MODL is, why it exists, and how it unlocks modular Uniswap v4 hooks.
---

## What is MODL?

MODL (Modular On-Chain Dynamic Logic) is a Uniswap v4 **hook aggregator**. Uniswap v4 restricts each pool to a single hook address, but modern deployments often need multiple behaviors (access control, custom fee logic, limit orders, analytics). MODL lets you install many focused contracts—called _modules_—behind that single hook. The aggregator fans every lifecycle callback (`beforeSwap`, `afterAddLiquidity`, etc.) out to the registered modules, honoring a deterministic order, per-module gas budgets, and failure policies.

Key goals:

- **Composability** – add/remove behaviors without rewriting a monolith.
- **Code reuse** – share battle-tested modules across pools.
- **Extensibility** – modules can expose their own APIs, yet users only need the aggregator address.
- **Gas awareness** – every module config defines a gas limit and whether failures should revert the whole hook (`critical`).
- **Developer experience** – the hook workflow mirrors Uniswap's BaseHook while keeping custom logic isolated.

## Why MODL?

Without MODL, every hook becomes a massive contract that mixes access policies, fee logic, and experimental features. Combining behaviors usually means copy/pasting code or wiring a spaghetti of inheritance and modifiers. The results are hard to audit, hard to test, and painful to extend.

MODL introduces two lightweight abstractions:

- **Modules** are small contracts that implement `IMODLModule`. Each module controls its own storage and can focus on a single responsibility.
- **MODLAggregator** orchestrates the modules. It enforces ordering, per-module gas caps, and whether errors bubble up. It also exposes a routing table so `placeOrder`, `notify`, or any other selector can be forwarded to modules without new entrypoints.

Together they deliver:

```text
PoolManager -> MODLAggregator -> [Whitelist] -> [DynamicFee] -> [LimitOrders]
```

```solidity
// Wiring two modules behind the aggregator
MODLAggregator.ModuleConfigInput[] memory configs = new MODLAggregator.ModuleConfigInput[](2);
configs[0] = _whitelistConfig(whitelist);
configs[1] = _dynamicFeeConfig(dynamicFee);
MODLAggregator aggregator = new MODLAggregator(poolManager, configs);
```

## End-to-end view

1. **Deployment** – You deploy modules (e.g., `WhitelistModule`, `DynamicFeeModule`) plus the aggregator. `setModules` registers them with hooks, priorities, gas limits, and `critical` flags.
2. **Pool creation** – When creating a Uniswap v4 pool you pass the aggregator as the hook. The pool only knows this single address.
3. **Runtime** – When the pool calls `beforeSwap`, the aggregator decodes the shared hook data, then executes each module in priority order. Non-critical modules that revert emit `ModuleExecutionSkipped` and execution continues.
4. **External APIs** – Users interact with custom module functions via the aggregator fallback (e.g., `aggregator.placeOrder(...)`). Routes map selectors to modules and choose whether to run the first target or all of them.

This architecture keeps business logic modular while satisfying Uniswap's "one hook per pool" constraint.
