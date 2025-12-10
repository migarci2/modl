# MODL Hardhat deployer

Scripts to deploy `MODLAggregator` and base modules using Foundry artifacts (`out/`).

## Setup

1) From repo root run `forge build` (produces `out/` artifacts consumed by the script).  
2) Create a `.env` in `demo/hardhat/` from `.env.example` with:
   - `RPC_URL` – HTTPS endpoint (Sepolia/Mainnet).
   - `PRIVATE_KEY` – deployer key (with or without `0x`).
   - `POOL_MANAGER` – Uniswap v4 `IPoolManager` address.
   - Optional: `ROUTE_SELECTOR`, `MIN_FEE`, `MAX_FEE`, `BASE_FEE`, `VOL_MULT`.

3) Install deps and deploy:

```bash
cd demo/hardhat
npm install
forge build
npx hardhat run --network sepolia --no-compile scripts/deploy-modl.ts
```

The script deploys:
- `MODLAggregator` (empty module list initially).
- `WhitelistModule` and `DynamicFeeModule` pointing to the aggregator.
- Calls `setModules` with gasLimit/priorities and marks Whitelist as critical.
- Optionally sets a fallback route for `ROUTE_SELECTOR` toward the fee module.

The output prints module indices you can reuse for extra routes or to build hookData from the `demo/` app.
