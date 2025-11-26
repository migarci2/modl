---
id: testing-tooling
title: Testing & Tooling
description: Validate modules with Foundry unit tests and aggregator integration suites.
---

## Unit testing modules

Each module should have focused Foundry tests that call the hook functions directly. Example for the whitelist policy:

```solidity
contract WhitelistModuleTest is Test {
    WhitelistModule module;
    address constant AGGREGATOR = address(0xA11CE);

    function setUp() public {
        module = new WhitelistModule(AGGREGATOR);
    }

    function testBlocksUnknownAddress() public {
        vm.expectRevert(WhitelistModule.NotWhitelisted.selector);
        module.beforeSwap(IPoolManager(address(0)), address(1), key, params, bytes(""));
    }
}
```

Because the module checks `msg.sender`, be sure to `vm.prank(AGGREGATOR)` when invoking hooks.

## Integration testing with MODL

Use mocks for `IPoolManager` to simulate Uniswap callbacks. The repo includes `test/MODLAggregator.t.sol`, which you can extend:

```solidity
function test_whitelist_blocks_non_whitelisted() public {
    MODLAggregator.ModuleConfigInput[] memory configs = _basicConfig();
    aggregator.setModules(configs);

    vm.expectRevert(abi.encodeWithSelector(
        MODLAggregator.ModuleExecutionFailed.selector,
        address(whitelist),
        MODLAggregator.Hook.BeforeSwap,
        abi.encodeWithSelector(WhitelistModule.AddressNotWhitelisted.selector, trader)
    ));

    manager.callBeforeSwap(aggregator, trader, poolKey, params, bytes(""));
}
```

## Gas reports

`forge test --gas-report` shows per-function costs, helping you choose gas limits. Run it on both modules and the aggregator integration tests to spot regressions.

## Tooling tips

- **Script deployments** – Foundry `script/` files can deploy modules, register them, and configure routes in one transaction.
- **Static analysis** – Use `slither` or `sforge` to ensure modules don't have reentrancy holes or unchecked external calls.
- **Snapshots** – When you update module ordering, snapshot `_modules` via `getModules()` and compare to previous deployments to verify priorities.
- **Scaffolding** – Use `@modl/cli` (`modl init`, `modl module:new ...`) to generate modules/tests from templates before adding your custom logic.

An automated test suite that mixes module-level and aggregator-level checks is the best defense against regressions when composing many behaviors.
