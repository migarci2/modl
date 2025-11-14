## MODL – Modular On-Chain Dynamic Logic

MODL is a Uniswap v4 hook aggregator that lets a single pool coordinate multiple pieces of custom logic. Instead of writing a monolithic hook, developers compose reusable modules that implement the `IMODLModule` interface. The aggregator enforces ordering, error handling, and hook-data routing so each module stays isolated.

### Architecture

- **`MODLAggregator.sol`**: Extends `BaseHook` and fans out every lifecycle callback to registered modules. Each module declares which hooks it cares about plus a `failOnRevert` policy and priority. Hook data is ABI-encoded as `IMODLModule.ModuleCallData[]`, allowing callers to send per-module payloads in a single bytes blob.
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
   - Deploy the module and register it through `MODLAggregator.setModules`, providing hook flags, priority, and failure policy.

4. **Hook data format**

   Calling contracts should encode hook data as `abi.encode(IMODLModule.ModuleCallData[] memory)`. Each entry contains the module address and the payload that the module expects. The aggregator extracts the relevant payload for each module automatically.

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
