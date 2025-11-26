---
id: getting-started
title: Getting Started
description: Install MODL, scaffold a module with the CLI, deploy the aggregator, and hook it to a Uniswap v4 pool.
---

## Install core + CLI

Core contracts (Foundry):

```bash
forge install migarci2/modl
```

CLI (global or local):

```bash
npm install -g @modl/cli
# or per project
npm install --save-dev @modl/cli
```

## Initialize your project

Run once in the project root:

```bash
modl init
```

This writes `modl.config.json` (with `src/modules` and `test/modules` by default) and creates the folders if missing. Pass `--force` to regenerate the config.

## Scaffold a module with the CLI

Create a basic module:

```bash
modl module:new WhitelistAlpha
```

Or start from a pattern:

```bash
modl module:new EigenDynamicFee -t eigen-oracle
modl module:new FhenixWhitelist -t fhenix-credentials
```

The CLI renders a Solidity module and a Forge test into the paths from `modl.config.json` (defaults: `src/modules/<Name>.sol`, `test/modules/<Name>.t.sol`).

## Minimal setup

Use the generated module (e.g., `WhitelistAlpha`) with the aggregator. Deploy a single module plus the aggregator, then register the module with a gas limit and `critical` flag.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MODLAggregator} from "modl/src/MODLAggregator.sol";
import {WhitelistAlpha} from "./src/modules/WhitelistAlpha.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

contract DeployScript {
    function deploy(IPoolManager poolManager) external returns (MODLAggregator) {
        WhitelistAlpha whitelist = new WhitelistAlpha(address(0));

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

1. `modl module:new WhitelistAlpha`
2. Deploy `WhitelistAlpha`, `DynamicFeeModule`, and `MODLAggregator`.
3. Register both modules via `setModules`, giving the whitelist priority `5` (critical) and dynamic fee priority `10` (critical) with a higher gas limit.
4. Create the pool with the aggregator's address as the hook.
5. Call `setWhitelist(trader, true)`.
6. Perform a swap through the pool. The aggregator runs the whitelist (reverts if sender not allowed) and then runs the fee logic (possibly overriding the LP fee) before forwarding the result back to the PoolManager.

## CLI commands you need

- `modl init` — create `modl.config.json` and module/test folders.
- `modl template:list` — discover available templates (basic, eigen-*, fhenix-*).
- `modl module:new <Name> [-t template]` — scaffold module + test from a template.

This minimal path proves that multiple modules can collaborate behind the single hook address Uniswap v4 expects.
