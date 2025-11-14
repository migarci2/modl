---
id: advanced-routing
title: Routing External Calls
description: Use the aggregator fallback to expose module APIs like placeOrder().
---

The aggregator includes a fallback that inspects `msg.sig`, fetches a `Route`, and forwards the calldata to the configured modules. This lets users and bots interact with complex modules via the **same address** used for hooks.

## Route structure

```solidity
struct Route {
    uint16[] moduleIndices; // reference into _modules[]
    ExecMode mode;          // FIRST or ALL
}
```

- **FIRST** – invoke the first module only and return immediately.
- **ALL** – loop through every module, returning the returndata from the last call.

## Configuring a route

Single-target example:

```solidity
bytes4 selector = ILimitOrderModule.placeOrder.selector;
uint16[] memory modules = new uint16[](1);
modules[0] = limitOrderModuleIndex;
aggregator.setRoute(selector, modules, MODLAggregator.ExecMode.FIRST);
```

Multi-target example:

```solidity
bytes4 selector = IRebalanceNotifier.notify.selector;
uint16[] memory modules = new uint16[](2);
modules[0] = analyticsIndex;
modules[1] = monitoringIndex;
aggregator.setRoute(selector, modules, MODLAggregator.ExecMode.ALL);
```

If you later remove a module, call `clearRoute(selector)` to avoid stale indices.

## External usage

Once routed, call the aggregator directly:

```solidity
ILimitOrderModule.PlaceOrderParams memory params = ILimitOrderModule.PlaceOrderParams({
    key: poolKey,
    tickToSellAt: 1230,
    zeroForOne: true,
    amountIn: 1e18
});

bytes32 orderId = ILimitOrderModule(address(aggregator)).placeOrder(params);
```

Behind the scenes the aggregator fallback invokes the module, enforces its gas limit, and forwards returndata or reverts.

## Failure semantics

Routing honors the same `critical` flag and gas limit as hooks:

- If a FIRST route hits a critical module that reverts, the entire call reverts.
- If the module is non-critical the aggregator reverts with the module's reason (fallback does not swallow errors).
- For ALL routes, the first revert stops the loop and bubbles the reason.

## End-to-end example

1. Register `LimitOrderModule` (module index 2) with `critical = true` and `gasLimit = 160_000`.
2. Configure `setRoute(ILimitOrderModule.placeOrder.selector, [2], ExecMode.FIRST)`.
3. A user calls `MODLAggregator.placeOrder(...)` with encoded params.
4. Fallback forwards the calldata to module index 2, which records the order and emits events.
5. The call returns a `bytes32 orderId` directly to the user.

No additional entrypoints are required, and the user only needs the aggregator address.
