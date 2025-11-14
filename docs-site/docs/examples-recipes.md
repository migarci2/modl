---
id: examples-recipes
title: Examples & Recipes
description: Practical flows that combine multiple modules and routing patterns.
---

## Recipe 1 – Whitelist + Dynamic Fee

**Goal:** Require approved addresses and dynamically adjust LP fees based on volatility.

1. Deploy `WhitelistModule` and `DynamicFeeModule` with the aggregator address.
2. Register modules:

```solidity
configs[0] = MODLAggregator.ModuleConfigInput({
    module: whitelist,
    hooks: _whitelistHooks(),
    critical: true,
    priority: 5,
    gasLimit: 45_000
});
configs[1] = MODLAggregator.ModuleConfigInput({
    module: dynamicFee,
    hooks: _feeHooks(),
    critical: true,
    priority: 10,
    gasLimit: 80_000
});
```

3. Whitelist traders via `whitelist.setWhitelist(trader, true)`.
4. During swaps the whitelist runs first; if it passes, the fee module overrides the LP fee using hook data or internal volatility metrics.

## Recipe 2 – Analytics logging (non-critical)

Attach a `LoggingModule` with a tiny gas limit:

```solidity
configs.push(MODLAggregator.ModuleConfigInput({
    module: logging,
    hooks: _loggingHooks(),
    critical: false,
    priority: 50,
    gasLimit: 25_000
}));
```

If it reverts, `ModuleExecutionSkipped` fires but swaps keep going. Use this for telemetry or event indexing without risking downtime.

## Recipe 3 – Limit orders + routing

1. Deploy `LimitOrderModule` (ERC-1155 receipts) and register it with hooks: `beforeSwap` (optional) and `afterSwap`.
2. Configure routes:

```solidity
uint16 limitIndex = _moduleIndex(address(limitOrder));
aggregator.setRoute(LimitOrderModule.placeOrder.selector, _single(limitIndex), ExecMode.FIRST);
aggregator.setRoute(LimitOrderModule.cancelOrder.selector, _single(limitIndex), ExecMode.FIRST);
aggregator.setRoute(LimitOrderModule.redeem.selector, _single(limitIndex), ExecMode.FIRST);
```

3. Users interact with `MODLAggregator.placeOrder(...)`, receive ERC-1155 receipts, and later redeem through the same address.
4. When price crosses the configured tick, `afterSwap` executes queued orders and records claimable amounts.

## Recipe 4 – Multi-module notification

Send a `notifyRebalance()` call to two modules (analytics + monitoring) using `ExecMode.ALL`:

```solidity
bytes4 sel = IRebalanceNotifier.notify.selector;
uint16[] memory modules = new uint16[](2);
modules[0] = analyticsIndex;
modules[1] = monitoringIndex;
aggregator.setRoute(sel, modules, MODLAggregator.ExecMode.ALL);
```

Callers simply execute `MODLAggregator.notifyRebalance()` and both modules receive the same calldata.

These recipes show how to mix modules with different priorities, criticality levels, and routing needs to compose complex hook behavior.
