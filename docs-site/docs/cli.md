---
id: cli
title: modl CLI
description: Generate MODL modules and tests from templates with @modl/cli.
---

The `@modl/cli` is a code generator for MODL modules. It writes Solidity modules and Forge tests from a set of built-in templates (basic, Fhenix, Eigen) so you can focus on hook logic instead of boilerplate.

## Install

Requires Node.js 18+.

```bash
npm install -g @modl/cli
# or locally per project
npm install --save-dev @modl/cli
```

Check it works:

```bash
modl --help
```

## Initialize a project

Run in your project root:

```bash
modl init
```

This writes `modl.config.json` and ensures the module and test folders exist (defaults: `src/modules`, `test/modules`). If the file already exists, the CLI will not overwrite it unless you pass `--force`.

## Create a module

```bash
modl module:new LimitOrders
modl module:new EigenDynamicFee -t eigen-oracle
modl module:new FhenixWhitelist -t fhenix-credentials
```

What happens:

1. Reads `modl.config.json`.
2. Picks the template (default `basic` unless `defaultTemplate` is set).
3. Renders placeholders (`{{MODULE_NAME}}`, `{{MODULE_FILE_NAME}}`) into a Solidity module and a Forge test.
4. Writes files into `modulesDir/<Name>.sol` and `testsDir/<Name>.t.sol`.

Use `--force` to overwrite existing files.

## List templates

```bash
modl template:list
```

Built-in templates:

- `basic` — empty MODL module skeleton.
- `fhenix-credentials` — encrypted-credential gating; extends `FhenixCredentialsModule`.
- `fhenix-async` — async FHE task pattern; extends `FhenixAsyncModule`.
- `eigen-oracle` — consumes a freshness-checked oracle; extends `EigenOracleModule`.
- `eigen-task` — async AVS task pattern; extends `EigenTaskModule`.

Each template includes `Module.sol.tpl` and `Module.t.sol.tpl` in the CLI package.

## Configuration

`modl.config.json` example:

```json
{
  "modulesDir": "src/modules",
  "testsDir": "test/modules",
  "defaultTemplate": "basic",
  "projectType": "foundry",
  "solidityVersion": "0.8.26"
}
```

You can edit these paths at any time. The CLI resolves relative paths from the current working directory.

## Fhenix & EigenLayer notes

- Fhenix templates import `@fhenixprotocol/cofhe-contracts` via the `@modl/core` base modules. Install it yourself and add a Foundry remapping, for example:

  ```toml
  remappings = ['@fhenixprotocol/cofhe-contracts/=node_modules/@fhenixprotocol/cofhe-contracts/']
  ```

- Eigen templates rely on generic interfaces/bases in `@modl/core`; they do not pin to a specific AVS. Connect them to your oracle or task manager implementation in your project.

## Next steps

- Run `forge test` after generation to validate the scaffolds.
- Explore the `cli/templates/` folder to customize or add templates.
- Consider a future `modl doctor` command to verify dependencies if you plan to share the CLI with your team.
