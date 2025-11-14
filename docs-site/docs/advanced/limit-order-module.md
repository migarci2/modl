---
id: advanced-limit-order-module
title: Complex Example – LimitOrderModule
description: Showcase a stateful module that uses routing and afterSwap execution to settle limit orders.
---

The LimitOrderModule demonstrates how far MODL can be stretched. It exposes three public APIs (`placeOrder`, `cancelOrder`, `redeem`) while hooking into `afterSwap` to execute orders when ticks cross.

## Storage layout

- `mapping(bytes32 => Order)` pending orders keyed by pool/tick/direction.
- ERC-1155 tokens representing claims on executed orders.
- Aggregated claimable output per order ID.

## Public API (routed)

```solidity
contract LimitOrderModule is IMODLModule, ERC1155 {
    struct OrderKey {
        PoolKey key;
        int24 tick;
        bool zeroForOne;
    }

    function placeOrder(OrderKey calldata k, uint256 amountIn) external returns (bytes32 orderId) {
        // normalize tick, pull tokens from msg.sender, mint ERC1155 receipt
    }

    function cancelOrder(bytes32 orderId, uint256 shares) external {
        // burn receipt, return proportional funds
    }

    function redeem(bytes32 orderId) external {
        // burn full receipt, send executed output tokens
    }
}
```

Routes:

```solidity
uint16[] memory idx = new uint16[](1);
idx[0] = limitOrderModuleIndex;
aggregator.setRoute(LimitOrderModule.placeOrder.selector, idx, ExecMode.FIRST);
aggregator.setRoute(LimitOrderModule.cancelOrder.selector, idx, ExecMode.FIRST);
aggregator.setRoute(LimitOrderModule.redeem.selector, idx, ExecMode.FIRST);
```

## Hook integration

`afterSwap` inspects tick changes, executes orders, and credits claimable balances:

```solidity
function afterSwap(
    IPoolManager,
    address,
    PoolKey calldata key,
    SwapParams calldata params,
    BalanceDelta delta,
    bytes calldata
) external onlyAggregator returns (AfterSwapResult memory) {
    // 1. Observe tick movement (via oracle or cached data)
    // 2. Determine which pending orders crossed the threshold
    // 3. Swap against the pool manager to fill orders
    // 4. Update claimable output + emit events
    return AfterSwapResult({hasDelta: false, delta: 0});
}
```

The heavy lifting occurs only when ticks move, so configuring an ample gas limit (e.g., 180k) and setting `critical = true` ensures correctness while giving enough headroom.

## Lifecycle walkthrough

1. **User calls `placeOrder` via aggregator** – fallback forwards to module, which pulls tokens and mints an ERC-1155 receipt representing the position.
2. **Market moves** – during future swaps the aggregator calls `afterSwap`, the module detects eligible orders, executes them against the pool, and records claimable output.
3. **Redemption** – receipt holders call `redeem` via the aggregator to burn their ERC-1155 tokens and withdraw proceeds.

This end-to-end flow proves MODL can handle complex, stateful logic interacting with both Uniswap hooks and off-hook APIs while keeping the external surface to a single contract address.
