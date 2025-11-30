# modl CLI

Code generator for MODL modules. It is explicit and template-driven: the CLI writes Solidity modules and tests to your project; it does not run migrations or spin up chains.

## Install

```bash
npm install -g @modl-dev/cli
# or locally
npm install --save-dev @modl-dev/cli
```

You can also use it directly with npx:

```bash
npx @modl-dev/cli init
```

## Commands

- `modl init` — create `modl.config.json` with sensible defaults and ensure module/test folders exist.
- `modl template:list` — list available templates.
- `modl module:new <Name> [-t template] [--force]` — generate a module and test from a template.

## Config

`modl.config.json` lives in your project root:

```json
{
  "modulesDir": "src/modules",
  "testsDir": "test/modules",
  "defaultTemplate": "basic",
  "projectType": "foundry",
  "solidityVersion": "0.8.26"
}
```

Use `modl init` to create it. Update paths if your layout differs.

## Templates

Templates live inside the CLI and are rendered with simple placeholders:

- `basic` — empty MODLmodule skeleton.
- `fhenix-credentials` — encrypted-credential gating module (Fhenix).
- `fhenix-async` — async FHE task pattern (CoFHE-style).
- `eigen-oracle` — module consuming a freshness-checked EigenLayer oracle.
- `eigen-task` — module posting async tasks to an EigenLayer AVS.

Each template ships `Module.sol.tpl` and `Module.t.sol.tpl`. Placeholders:

- `{{MODULE_NAME}}` — contract name.
- `{{MODULE_FILE_NAME}}` — file name stem (usually same as name).

## Typical flow

```bash
# initialize
modl init

# list templates
modl template:list

# create a basic module
modl module:new LimitOrders

# Eigen oracle-based module
modl module:new EigenDynamicFee -t eigen-oracle

# Fhenix credentials-based module (requires @fhenixprotocol/cofhe-contracts)
modl module:new FhenixWhitelist -t fhenix-credentials
```

## Notes on deps

- Fhenix templates import `@fhenixprotocol/cofhe-contracts` via `@modl/core` base modules. Install it and set Foundry remappings if needed.
- Eigen templates rely on the generic interfaces shipped in `@modl/core`; AVS-specific wiring lives in your project.
