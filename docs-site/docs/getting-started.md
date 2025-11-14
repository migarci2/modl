---
id: getting-started
title: Getting Started
description: Install MODL, deploy your first aggregator, and hook it to a Uniswap v4 pool.
---

## Installation

Install the repository as a Foundry dependency:

```bash
forge install migarci2/modl
```

or wire it manually in `foundry.toml`:

```toml
[profile.default]
src = 'src'
libs = ['lib']

[dependencies]
modl = { path = 'lib/modl' }
```

Remember to add the MODL remappings if your project already uses Uniswap v4 libraries.

## Minimal setup

The snippet below deploys a single module plus the aggregator, then registers the module with a gas limit and `critical` flag.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MODLAggregator} from "modl/src/MODLAggregator.sol";
import {WhitelistModule} from "modl/src/modules/WhitelistModule.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

contract DeployScript {
    function deploy(IPoolManager poolManager) external returns (MODLAggregator) {
        WhitelistModule whitelist = new WhitelistModule(address(0));

        MODLAggregator.ModuleHooks memory hooks;
        hooks.beforeSwap = true;
        hooks.beforeAddLiquidity = true;

        MODLAggregator.ModuleConfigInput[] memory configs = new MODLAggregator.ModuleConfigInput[](1);
        configs[0] = MODLAggregator.ModuleConfigInput({
            module: whitelist,
            hooks: hooks,
            critical: true,
            priority: 10,
            gasLimit: 50_000
        });

        MODLAggregator aggregator = new MODLAggregator(poolManager, configs);
        whitelist.transferOwnership(address(aggregator));
        return aggregator;
    }
}
```

> 📝 `transferOwnership` ensures only the aggregator can call module hooks. You can also add constructor parameters to pass the aggregator address directly.

## Hooking into a pool

When deploying a Uniswap v4 pool, supply the aggregator as the hook:

```solidity
PoolKey memory key = PoolKey({
    currency0: currencyA,
    currency1: currencyB,
    fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
    tickSpacing: 60,
    hooks: IHooks(address(aggregator))
});

IPoolManager.CreatePoolParams memory params = IPoolManager.CreatePoolParams({
    key: key,
    sqrtPriceX96: initialPrice
});

poolManager.initialize(params);
```

From this point onward every lifecycle call on the pool triggers the aggregator, which in turn executes your module list.

## First end-to-end flow

1. Deploy `WhitelistModule`, `DynamicFeeModule`, and `MODLAggregator`.
2. Register both modules via `setModules`, giving the whitelist priority `5` (critical) and dynamic fee priority `10` (critical) with a higher gas limit.
3. Create the pool with the aggregator's address as the hook.
4. Call `setWhitelist(trader, true)`.
5. Perform a swap through the pool. The aggregator runs the whitelist (reverts if sender not allowed) and then runs the fee logic (possibly overriding the LP fee) before forwarding the result back to the PoolManager.

This minimal path proves that multiple modules can collaborate behind the single hook address Uniswap v4 expects.
