---
id: concepts
title: Core Concepts
description: Understand aggregators, modules, routing, and per-module gas control.
---

## MODLAggregator

The aggregator is the **only hook address** known by the pool. Every Uniswap v4 callback (`beforeSwap`, `afterSwap`, donations, liquidity changes) flows through it. Internally it stores `ModuleConfig` structs with the module address, hook bitmap, priority, gas limit, and `critical` flag.

When a hook fires:

1. Hook data is decoded once into `IMODLModule.ModuleCallData[]`.
2. The aggregator loops through the sorted module array.
3. For modules that opted into the hook, it builds the calldata and invokes `_callModuleHook`, which enforces the gas limit and handles errors.
4. Return values (fee overrides, balance deltas) are aggregated and sent back to the PoolManager.

```solidity
function _executeBeforeSwap( /* ... */ ) private returns (BeforeSwapDelta delta, uint24 fee) {
    for (uint256 i = 0; i < _modules.length; ++i) {
        ModuleConfig storage cfg = _modules[i];
        if (!_hasHook(cfg.hooksBitmap, _HOOK_BEFORE_SWAP)) continue;
        (bool ok, bytes memory ret) = _callModuleHook(cfg, Hook.BeforeSwap, payload);
        if (!ok || ret.length == 0) continue;
        IMODLModule.BeforeSwapResult memory res = abi.decode(ret, (IMODLModule.BeforeSwapResult));
        // merge deltas + fee overrides
    }
}
```

Because only the aggregator touches the hook permissions, you can upgrade behaviors simply by calling `setModules`.

## Modules

A module is any contract that implements `IMODLModule`. Important traits:

- Modules run in their own storage (no `delegatecall`).
- They can be stateless (logging) or stateful (whitelists, loyalty points, limit orders).
- They may expose extra endpoints—e.g., `configure()`, `placeOrder()`—which the aggregator can route through its fallback.

Minimal skeleton:

```solidity
contract ExampleModule is IMODLModule {
    address public immutable aggregator;

    modifier onlyAggregator() {
        if (msg.sender != aggregator) revert NotAggregator(msg.sender);
        _;
    }

    constructor(address aggregator_) {
        aggregator = aggregator_;
    }

    function beforeSwap(
        IPoolManager poolManager,
        address sender,
        PoolKey calldata key,
        SwapParams calldata params,
        bytes calldata data
    ) external onlyAggregator returns (BeforeSwapResult memory) {
        // implement policy
    }

    // implement other hooks as needed
}
```

## Routing

The aggregator exposes `setRoute(bytes4 selector, uint16[] moduleIndices, ExecMode mode)` and a payable fallback. When a selector that the aggregator itself does not implement is called, fallback:

1. Looks up the `Route` struct.
2. Validates that each module index is still registered.
3. Calls the configured modules with the original `msg.data`.
4. Stops after the first target (`ExecMode.FIRST`) or runs every target (`ExecMode.ALL`), returning the last returndata buffer.

This enables UX such as `aggregator.placeOrder(...)` even if `placeOrder` lives inside a module. Frontends and automation only track one address.

```solidity
bytes4 sel = ILimitOrderModule.placeOrder.selector;
uint16[] memory indices = new uint16[](1);
indices[0] = 2; // limit order module index
aggregator.setRoute(sel, indices, MODLAggregator.ExecMode.FIRST);
```

## Gas control per module

Each `ModuleConfig` field controls runtime behavior:

- `gasLimit` – Maximum gas forwarded to that module. `0` = unlimited.
- `critical` – If `true`, any revert or out-of-gas reverts the entire hook. If `false`, the aggregator emits `ModuleExecutionSkipped` and continues.

Use cases:

- **Defensive policies** (whitelists, risk checks) should be `critical` with well-measured gas limits.
- **Best-effort logic** (analytics, logging, optional rewards) can be non-critical, capped at a low gas limit to avoid griefing.

This model keeps multi-module hooks deterministic even when some modules are experimental.
