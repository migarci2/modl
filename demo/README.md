# MODL Hook Studio (demo)

Neo-brutalist front-end to compose Uniswap v4 hooks using the MODL aggregator, pick modules, estimate gas, and generate deployment payloads.

## Scripts

- `npm install` – install dependencies.
- `npm run dev` – local dev at `http://localhost:5173`.
- `npm run build` – production build. Set `DEMO_BASE=/modl/demo/` for GitHub Pages path.
- `npm run preview` – serve the built app locally.
- On-chain deploy: use the runner in `demo/hardhat/` with Foundry artifacts (`forge build`, `.env`, then `npx hardhat run --network ... scripts/deploy-modl.ts`).

## Notes

- Uses Tailwind + React 19 and the JetBrains Mono typeface from the deck.
- Gas estimates are indicative: base aggregator cost + declared module gas.
- The custom module form creates an entry with a suggested `gasLimit` and lets you mark it as critical.
