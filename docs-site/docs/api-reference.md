---
id: api-reference
title: API Reference
description: Contract surfaces for MODLAggregator, IMODLModule, and built-in modules.
---

## MODLAggregator

### constructor
`constructor(IPoolManager poolManager, ModuleConfigInput[] memory initialModules)`

Initializes the hook with an optional module list.

### setModules
`function setModules(ModuleConfigInput[] memory configs) external onlyOwner`

- Clears previous modules, registers the provided list, and sorts by priority.
- Emits `ModuleConfigured` per entry.

`ModuleConfigInput` fields:

| Field     | Description |
|-----------|-------------|
| `module`  | Address implementing `IMODLModule` |
| `hooks`   | Struct of booleans opting into lifecycle events |
| `critical`| Revert behavior flag |
| `priority`| Execution ordering (lower runs first) |
| `gasLimit`| Per-call gas cap (0 = unlimited) |

### setRoute / clearRoute
```
function setRoute(bytes4 selector, uint16[] calldata moduleIndices, ExecMode mode) external onlyOwner;
function clearRoute(bytes4 selector) external onlyOwner;
```

Maintain the fallback routing table. Emits `RouteSet` / `RouteCleared`.

### routes
`function routes(bytes4 selector) external view returns (Route memory)`

Retrieve the stored module indices and exec mode for a selector.

### getModules
`function getModules() external view returns (ModuleConfigView[] memory)`

View-layer representation of the registry with decoded hooks.

## IMODLModule

Modules must implement all hook signatures, even if returning default structs.

Key callbacks:

- `beforeSwap(...) returns (BeforeSwapResult memory)`
- `afterSwap(...) returns (AfterSwapResult memory)`
- `afterAddLiquidity(...) returns (BalanceDeltaResult memory)`
- `afterRemoveLiquidity(...) returns (BalanceDeltaResult memory)`
- `beforeDonate(...)` / `afterDonate(...)`

Returned structs:

```solidity
struct BeforeSwapResult { bool hasDelta; BeforeSwapDelta delta; bool hasNewFee; uint24 newFee; }
struct AfterSwapResult { bool hasDelta; int128 delta; }
struct BalanceDeltaResult { bool hasDelta; BalanceDelta delta; }
```

## Built-in modules

### WhitelistModule

- `setWhitelist(address account, bool allowed)` – Owner-only, manages allowed senders.
- Hooks: before/after swap, liquidity, donation.
- Errors: `NotAggregator`, `AddressNotWhitelisted`.

### DynamicFeeModule

- `configureFeeWindow(uint24 minFee, uint24 maxFee, uint24 baseFee)` – Owner-only.
- `setVolatilityIndex(uint24 newIndex)` / `setVolatilityMultiplier(uint24 multiplier)` – owner-only adjustments that influence LP fee overrides.
- Hook: `beforeSwap` returns `BeforeSwapResult` with `hasNewFee = true`.

As you add modules, document their admin functions, emitted events, and hook behaviors here for quick reference.
