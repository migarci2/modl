## MODL – Modular On-Chain Dynamic Logic

MODL is a Uniswap v4 hook aggregator that lets a single pool coordinate multiple pieces of custom logic. Instead of writing a monolithic hook, developers compose reusable modules that implement the `IMODLModule` interface. The aggregator enforces ordering, error handling, and hook-data routing so each module stays isolated.

### Architecture

- **`MODLAggregator.sol`**: Extends `BaseHook` and fans out every lifecycle callback to registered modules. Each module declares which hooks it cares about plus a per-module gas budget, failure policy (`critical`), and priority. Hook data is ABI-encoded as `IMODLModule.ModuleCallData[]`, allowing callers to send per-module payloads in a single bytes blob. The aggregator also exposes a deterministic routing table that forwards arbitrary function selectors (like `placeOrder`) through its fallback to one or more modules.
- **`IMODLModule`**: Shared interface covering every pool lifecycle callback plus return-value structs for hooks that produce deltas or fee overrides. Modules receive the `IPoolManager`, the hook caller, and hook-specific data.
- **Modules**:
  - `WhitelistModule`: Reusable access control for swaps, liquidity updates, and donations. Owners manage the whitelist and can toggle enforcement per action.
  - `DynamicFeeModule`: Computes a dynamic LP fee override based on configurable volatility parameters or per-swap instructions embedded in hook data.

### Usage

1. **Install dependencies and compile**

   ```bash
   forge build
   ```

2. **Run the full test suite**

   ```bash
   forge test
   ```

3. **Add new modules**

   - Implement `IMODLModule`, ensuring only the aggregator can invoke the hook entrypoints.
   - Deploy the module and register it through `MODLAggregator.setModules`, providing hook flags, execution priority, per-call `gasLimit` (set to `0` for unlimited), and whether the module is `critical` (reverting the whole hook on failure).
  - Optional: map extra function selectors (e.g., `placeOrder(bytes calldata)`) with `setRoute(bytes4 selector, uint16[] moduleIndices, ExecMode mode)` so that users can call those functions directly on the aggregator. The fallback forwards the original calldata to the routed modules, either stopping at the first module or executing every module in order depending on `ExecMode`.

4. **Hook data format**

   Calling contracts should encode hook data as `abi.encode(IMODLModule.ModuleCallData[] memory)`. Each entry contains the module address and the payload that the module expects. The aggregator extracts the relevant payload for each module automatically.

5. **Function routing**

   Routes are configured via `setRoute(bytes4 selector, uint16[] moduleIndices, ExecMode mode)`. The mapping is deterministic: selectors resolve to an ordered list of module indices stored inside the aggregator, so every call takes the exact same path. Routes can be cleared with `clearRoute`. When a user calls an unknown function on the aggregator, the fallback looks up the selector and forwards the original calldata with the configured gas budget of each module. `ExecMode.FIRST` stops after the first module, while `ExecMode.ALL` executes every module and returns the last module's returndata.

### modl CLI

Generate modules and tests from templates:

```bash
npm install -g @modl-dev/cli   # or npm install --save-dev @modl-dev/cli
modl init                      # writes modl.config.json and creates module/test folders
modl template:list             # discover available templates
modl module:new MyModule       # uses default template (basic)
modl module:new EigenDynamicFee -t eigen-oracle
modl module:new FhenixWhitelist -t fhenix-credentials
```

You can also use it directly with npx:

```bash
npx @modl-dev/cli init
npx @modl-dev/cli module:new MyModule
```

Templates are stored in `cli/templates` and rendered with simple placeholders (`{{MODULE_NAME}}`). Fhenix templates expect `@fhenixprotocol/cofhe-contracts` to be installed and remapped in Foundry.

### Deployment notes

Uniswap v4 assigns hook permissions via contract address bits. For local development the aggregator skips the address validation, but production deployments must use a HookMiner-style deployer to land at an address compatible with the permissions returned by `getHookPermissions`.

### Project layout

```
src/
  MODLAggregator.sol            # Core hook aggregator
  interfaces/IMODLModule.sol    # Shared module interface
  modules/
    DynamicFeeModule.sol
    WhitelistModule.sol
test/
  MODLAggregator.t.sol          # Aggregator integration tests
  modules/
    DynamicFeeModule.t.sol
    WhitelistModule.t.sol
```
