export type ModuleSpec = {
  id: string;
  name: string;
  version: string;
  description: string;
  hooks: string[];
  tags: string[];
  status: 'battle-tested' | 'beta' | 'experimental';
  risk: 'low' | 'medium' | 'high';
  deployable?: boolean;
  artifact?: 'WhitelistModule' | 'DynamicFeeModule';
  gas: {
    deploy: number;
    perSwap?: number;
    perLiquidity?: number;
    perInitialize?: number;
    gasBudget?: number;
  };
  address: string;
  warning?: string;
  docs?: string;
  accent?: string;
  // Constructor parameters for deployable modules
  constructorParams?: {
    name: string;
    type: 'uint24' | 'uint256' | 'address' | 'bool';
    label: string;
    default: number | string | boolean;
    description?: string;
  }[];
};

export const moduleCatalog: ModuleSpec[] = [
  {
    id: 'whitelist',
    name: 'Whitelist Module',
    version: '1.0.0',
    description: 'Allow-list swaps, liquidity updates, and donations with packed storage and batch updates.',
    hooks: ['beforeSwap', 'afterSwap', 'beforeAddLiquidity', 'afterAddLiquidity', 'donations'],
    tags: ['access control', 'safety', 'battle-tested'],
    status: 'battle-tested',
    risk: 'low',
    deployable: true,
    artifact: 'WhitelistModule',
    gas: {
      deploy: 180_000,
      perSwap: 45_000,
      perLiquidity: 28_000,
      gasBudget: 90_000,
    },
    address: '',
    warning: 'Seed the whitelist before enabling enforcement on swaps and liquidity.',
    accent: 'bg-lemonade',
  },
  {
    id: 'dynamic-fee',
    name: 'Dynamic Fee Module',
    version: '1.1.0',
    description: 'Adjust LP fee based on volatility parameters or per-swap instructions in hook data.',
    hooks: ['beforeSwap', 'afterSwap'],
    tags: ['fees', 'volatility', 'oracle-ready'],
    status: 'battle-tested',
    risk: 'medium',
    deployable: true,
    artifact: 'DynamicFeeModule',
    gas: {
      deploy: 220_000,
      perSwap: 65_000,
      gasBudget: 120_000,
    },
    address: '',
    warning: 'Provide a TWAP or oracle feed when using aggressive fee swings.',
    accent: 'bg-mint',
    constructorParams: [
      { name: 'minFee', type: 'uint24', label: 'Min Fee (bps)', default: 500, description: 'Minimum fee (500 = 0.05%)' },
      { name: 'maxFee', type: 'uint24', label: 'Max Fee (bps)', default: 3000, description: 'Maximum fee (3000 = 0.3%)' },
      { name: 'baseFee', type: 'uint24', label: 'Base Fee (bps)', default: 1000, description: 'Base fee (1000 = 0.1%)' },
      { name: 'volatilityMultiplier', type: 'uint24', label: 'Volatility Mult', default: 200, description: 'Multiplier for volatility index' },
    ],
  },
  {
    id: 'eigen-oracle',
    name: 'EigenLayer Oracle Tasks',
    version: '0.3.0',
    description: 'Pull EigenLayer task attestations to gate swaps or donate protocol rewards.',
    hooks: ['afterSwap', 'afterDonate', 'beforeAddLiquidity'],
    tags: ['oracle', 'keepers', 'compliance'],
    status: 'beta',
    risk: 'medium',
    gas: {
      deploy: 260_000,
      perSwap: 52_000,
      perLiquidity: 35_000,
      gasBudget: 140_000,
    },
    address: '',
    warning: 'Requires a live Eigen task feed and operator signatures.',
    accent: 'bg-sky',
    constructorParams: [
      { name: 'oracleAddress', type: 'address', label: 'Oracle Address', default: '', description: 'EigenLayer oracle contract address' },
      { name: 'maxStaleness', type: 'uint256', label: 'Max Staleness (sec)', default: 3600, description: 'Maximum allowed age of oracle data in seconds' },
    ],
  },
  {
    id: 'fhenix-privacy',
    name: 'Fhenix Credentials',
    version: '0.4.2',
    description: 'Use FHE credentials to prove user eligibility without leaking addresses.',
    hooks: ['beforeSwap', 'beforeAddLiquidity', 'beforeDonate'],
    tags: ['privacy', 'kyc', 'fhenix'],
    status: 'beta',
    risk: 'medium',
    gas: {
      deploy: 280_000,
      perSwap: 72_000,
      perLiquidity: 58_000,
      gasBudget: 160_000,
    },
    address: '',
    warning: 'Needs Fhenix providers and offchain proofs to be updated frequently.',
    accent: 'bg-blush',
    constructorParams: [
      { name: 'verifierAddress', type: 'address', label: 'Verifier Address', default: '', description: 'Fhenix credential verifier contract' },
    ],
  },
  {
    id: 'keeper-rebalancer',
    name: 'Keeper Rebalancer',
    version: '0.2.1',
    description: 'Automated range shifts and donations triggered by keeper task conditions.',
    hooks: ['afterSwap', 'afterAddLiquidity', 'afterRemoveLiquidity'],
    tags: ['automation', 'keepers', 'liquidity'],
    status: 'experimental',
    risk: 'medium',
    gas: {
      deploy: 210_000,
      perSwap: 38_000,
      perLiquidity: 66_000,
      gasBudget: 110_000,
    },
    address: '',
    warning: 'Keepers must cap gas; add a fallback route to pause automation on spikes.',
    accent: 'bg-amber-100',
  },
  {
    id: 'risk-guard',
    name: 'Risk Guard',
    version: '0.1.4',
    description: 'Circuit breaker for abnormal deltas, slippage spikes, and TWAP drift.',
    hooks: ['beforeSwap', 'afterSwap'],
    tags: ['risk', 'circuit-breaker', 'analytics'],
    status: 'beta',
    risk: 'high',
    gas: {
      deploy: 200_000,
      perSwap: 55_000,
      gasBudget: 130_000,
    },
    address: '',
    warning: 'Set conservative thresholds; mark as critical so swaps halt on anomalies.',
    accent: 'bg-purple-100',
  },
];
