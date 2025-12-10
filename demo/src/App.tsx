import { useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Braces,
  Gauge,
  LayoutTemplate,
  Rocket,
  ShieldCheck,
  Wand2,
} from 'lucide-react';
import { ethers } from 'ethers';
import ModuleCard from './components/ModuleCard';
import { NeoCard } from './components/NeoCard';
import { NeoButton } from './components/NeoButton';
import type { ModuleSpec } from './data/modules';
import { moduleCatalog } from './data/modules';
import { hookNamesToFlags, estimateMiningDifficulty, mineHookAddressSync } from './utils/hookMiner';

type ModuleConfigState = {
  gasLimit: number;
  critical: boolean;
  priority: number;
  constructorArgs?: Record<string, number | string | boolean>;
};

const baseDeployGas = 820_000;
const baseSwapGas = 95_000;
const baseLiquidityGas = 78_000;
const supportedArtifacts = ['MODLAggregator', 'WhitelistModule', 'DynamicFeeModule'] as const;

// PoolManager addresses per network (Uniswap v4)
const POOL_MANAGERS: Record<string, string> = {
  mainnet: '0x000000000004444c5dc75cB358380D2e3dE08A90',
  sepolia: '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543',
  unichain: '0x1f98400000000000000000000000000000000004',
};

// Chain IDs for network switching
const CHAIN_IDS: Record<string, number> = {
  mainnet: 1,
  sepolia: 11155111,
  unichain: 130,
};

const HeroBadge = ({ children, color = 'bg-black text-white' }: { children: ReactNode; color?: string }) => (
  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 border-2 border-black ${color}`}>{children}</span>
);

const SectionTitle = ({ title, kicker }: { title: string; kicker?: string }) => (
  <div className="flex items-center gap-2 mb-3">
    <span className="section-label">{kicker ?? 'section'}</span>
    <h2 className="text-xl md:text-2xl font-black uppercase">{title}</h2>
  </div>
);

export default function App() {
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>(['whitelist', 'dynamic-fee']);
  const [moduleConfigs, setModuleConfigs] = useState<Record<string, ModuleConfigState>>({
    whitelist: { gasLimit: 90_000, critical: true, priority: 90 },
    'dynamic-fee': { gasLimit: 120_000, critical: false, priority: 70 },
  });
  const [customModules, setCustomModules] = useState<ModuleSpec[]>([]);
  const [moduleAddresses, setModuleAddresses] = useState<Record<string, string>>({
    whitelist: '0x1111111111111111111111111111111111111111',
    'dynamic-fee': '0x2222222222222222222222222222222222222222',
  });
  const [aggregatorAddress, setAggregatorAddress] = useState<string>('');
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [chainId, setChainId] = useState<number | null>(null);
  const [deployStatus, setDeployStatus] = useState<string>('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployTxs, setDeployTxs] = useState<string[]>([]);
  const [network, setNetwork] = useState('sepolia');
  const [poolManager, setPoolManager] = useState(POOL_MANAGERS.sepolia);
  const [gasPrice, setGasPrice] = useState(12);
  const [routeMode, setRouteMode] = useState<'ALL' | 'FIRST'>('ALL');
  const [minedSalt, setMinedSalt] = useState<string | null>(null);
  const [minedAddress, setMinedAddress] = useState<string | null>(null);
  const [customDraft, setCustomDraft] = useState({
    name: '',
    address: '',
    gasLimit: 100_000,
    hooks: '',
    risk: 'low' as ModuleSpec['risk'],
  });

  const allModules = useMemo(() => [...moduleCatalog, ...customModules], [customModules]);
  const selectedModules = useMemo(
    () => allModules.filter((module) => selectedModuleIds.includes(module.id)),
    [allModules, selectedModuleIds],
  );

  const getDefaultConfig = (module: ModuleSpec, prev: Record<string, ModuleConfigState>): ModuleConfigState => ({
    gasLimit: module.gas.gasBudget ?? Math.max(90_000, (module.gas.perSwap ?? 55_000) + 30_000),
    critical: module.risk !== 'low' || module.id === 'risk-guard',
    priority: Math.max(10, 100 - (Object.keys(prev).length + 1) * 8),
  });

  const toggleModule = (id: string) => {
    const module = allModules.find((m) => m.id === id);
    if (!module) return;
    setSelectedModuleIds((prev) => {
      if (prev.includes(id)) return prev.filter((m) => m !== id);
      setModuleConfigs((cfg) => (cfg[id] ? cfg : { ...cfg, [id]: getDefaultConfig(module, cfg) }));
      return [...prev, id];
    });
  };

  const updateConfig = (id: string, updates: Partial<ModuleConfigState>) => {
    const module = allModules.find((m) => m.id === id);
    setModuleConfigs((cfg) => ({
      ...cfg,
      [id]: {
        ...(cfg[id] ?? (module ? getDefaultConfig(module, cfg) : { gasLimit: 100_000, critical: false, priority: 50 })),
        ...updates,
      },
    }));
  };

  const addCustomModule = () => {
    const id = `custom-${customModules.length + 1}`;
    const module: ModuleSpec = {
      id,
      name: customDraft.name || 'Custom Module',
      version: '0.1.0',
      description: 'Module you deploy, protected with onlyAggregator and your own logic.',
      hooks: customDraft.hooks.split(',').map((hook) => hook.trim()).filter(Boolean),
      tags: ['custom', 'self-hosted'],
      status: 'experimental',
      risk: customDraft.risk,
      gas: {
        deploy: 190_000,
        perSwap: 50_000,
        perLiquidity: 40_000,
        gasBudget: customDraft.gasLimit,
      },
      address: customDraft.address || '0x0000000000000000000000000000000000000000',
      warning: 'Double-check the onlyAggregator guard and set gas limits before routing.',
      accent: 'bg-white',
    };
    setCustomModules((prev) => [...prev, module]);
    setSelectedModuleIds((prev) => [...prev, id]);
    setModuleConfigs((cfg) => ({
      ...cfg,
      [id]: {
        gasLimit: customDraft.gasLimit,
        critical: customDraft.risk !== 'low',
        priority: 60,
      },
    }));
    setModuleAddresses((prev) => ({ ...prev, [id]: customDraft.address || '0x0000000000000000000000000000000000000000' }));
  };

  const gasEstimates = useMemo(() => {
    const warnings = new Set<string>();
    let deploy = baseDeployGas;
    let perSwap = baseSwapGas;
    let perLiquidity = baseLiquidityGas;
    let configuredBudget = 0;
    let criticalCount = 0;

    selectedModules.forEach((module) => {
      deploy += module.gas.deploy;
      perSwap += module.gas.perSwap ?? 0;
      perLiquidity += module.gas.perLiquidity ?? 0;
      configuredBudget += moduleConfigs[module.id]?.gasLimit ?? module.gas.gasBudget ?? 0;
      if (moduleConfigs[module.id]?.critical) criticalCount += 1;
      if (module.status !== 'battle-tested') warnings.add(`${module.name} is ${module.status}; run it on testnet first.`);
      if (module.warning) warnings.add(module.warning);
      if ((moduleConfigs[module.id]?.gasLimit ?? 0) > (module.gas.gasBudget ?? 0) + 60_000) {
        warnings.add(`${module.name}: gas limits look inflated; tighten budgets.`);
      }
    });

    if (perSwap > 260_000) warnings.add('High swap gas; consider ExecMode.FIRST or trim modules.');
    if (perLiquidity > 240_000) warnings.add('Liquidity hooks are heavy; be careful with auto-rebalances.');
    if (configuredBudget > 650_000) warnings.add('Sum of gasLimits exceeds 650k; adjust priority to avoid OOG.');
    if (criticalCount === 0) warnings.add('Mark at least one critical module to halt swaps on failure.');
    if (routeMode === 'ALL' && selectedModules.length > 3) {
      warnings.add('ExecMode.ALL will execute multiple modules; confirm gas budgets.');
    }

    const costPerSwapEth = (perSwap * gasPrice) / 1e9;
    const deployCostEth = (deploy * gasPrice) / 1e9;

    return {
      deploy,
      perSwap,
      perLiquidity,
      configuredBudget,
      warnings: Array.from(warnings),
      costPerSwapEth,
      deployCostEth,
      criticalCount,
    };
  }, [selectedModules, moduleConfigs, gasPrice, routeMode]);

  const hookDataPreview = useMemo(
    () =>
      JSON.stringify(
        selectedModules.map((module, idx) => ({
          index: idx,
          module: module.address,
          hooks: module.hooks,
          gasLimit: moduleConfigs[module.id]?.gasLimit ?? module.gas.gasBudget ?? 0,
          critical: moduleConfigs[module.id]?.critical ?? false,
          priority: moduleConfigs[module.id]?.priority ?? 50,
        })),
        null,
        2,
      ),
    [selectedModules, moduleConfigs],
  );

  const routePreview = `setRoute(0xbaddcafe, [${selectedModules.map((_, idx) => idx).join(', ')}], ExecMode.${routeMode});`;

  // Calculate required hook flags from all selected modules
  const requiredHookFlags = useMemo(() => {
    const allHooks: string[] = [];
    selectedModules.forEach((module) => {
      module.hooks.forEach((hook) => allHooks.push(hook));
    });
    const flags = hookNamesToFlags(allHooks);
    const difficulty = estimateMiningDifficulty(flags);
    return { flags, allHooks: [...new Set(allHooks)], ...difficulty };
  }, [selectedModules]);

  const ensureProvider = async () => {
    if (!(window as any).ethereum) {
      throw new Error('No injected provider found. Open in a browser with MetaMask.');
    }
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    await provider.send('eth_requestAccounts', []);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    const { chainId: cid } = await provider.getNetwork();
    setWalletAddress(address);
    setChainId(Number(cid));
    return { provider, signer };
  };

  const fetchArtifact = async (name: typeof supportedArtifacts[number]) => {
    const res = await fetch(`/abi/${name}.json`);
    if (!res.ok) throw new Error(`Artifact ${name} not found. Run forge build to refresh /public/abi.`);
    return res.json();
  };

  const getHooksBitmap = (module: ModuleSpec) => ({
    beforeInitialize: module.hooks.includes('beforeInitialize'),
    afterInitialize: module.hooks.includes('afterInitialize'),
    beforeAddLiquidity: module.hooks.includes('beforeAddLiquidity'),
    afterAddLiquidity: module.hooks.includes('afterAddLiquidity'),
    beforeRemoveLiquidity: module.hooks.includes('beforeRemoveLiquidity'),
    afterRemoveLiquidity: module.hooks.includes('afterRemoveLiquidity'),
    beforeSwap: module.hooks.includes('beforeSwap'),
    afterSwap: module.hooks.includes('afterSwap'),
    beforeDonate: module.hooks.includes('beforeDonate'),
    afterDonate: module.hooks.includes('afterDonate'),
  });

  const deployWithMetaMask = async () => {
    try {
      setIsDeploying(true);
      setDeployStatus('Connecting wallet...');
      setDeployTxs([]);
      const { signer, provider } = await ensureProvider();

      // Verify correct network
      const currentNetwork = await provider.getNetwork();
      const expectedChainId = CHAIN_IDS[network];

      if (Number(currentNetwork.chainId) !== expectedChainId) {
        setDeployStatus(`Switching to ${network} (chain ${expectedChainId})...`);
        try {
          await (window as any).ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x' + expectedChainId.toString(16) }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            setDeployStatus(`Please add ${network} network to your wallet`);
          } else {
            setDeployStatus(`Failed to switch network: ${switchError.message}`);
          }
          setIsDeploying(false);
          return;
        }
      }

      setDeployStatus('Loading artifacts...');
      const aggregatorArtifact = await fetchArtifact('MODLAggregator');
      const whitelistArtifact = await fetchArtifact('WhitelistModule');
      const dynamicFeeArtifact = await fetchArtifact('DynamicFeeModule');

      let aggContract: ethers.Contract;
      let aggAddr = aggregatorAddress;

      if (aggregatorAddress) {
        setDeployStatus(`Using existing aggregator ${aggregatorAddress}`);
        aggContract = new ethers.Contract(aggregatorAddress, aggregatorArtifact.abi, signer);
      } else {
        setDeployStatus('Deploying MODLAggregator...');
        const aggFactory = new ethers.ContractFactory(
          aggregatorArtifact.abi,
          (aggregatorArtifact.bytecode && aggregatorArtifact.bytecode.object) || aggregatorArtifact.bytecode,
          signer,
        );
        aggContract = (await aggFactory.deploy(poolManager, [])) as unknown as ethers.Contract;
        setDeployTxs((prev) => [...prev, `Aggregator tx: ${aggContract.deploymentTransaction()?.hash ?? ''}`]);
        await aggContract.waitForDeployment();
        aggAddr = await aggContract.getAddress();
        setAggregatorAddress(aggAddr);
        setDeployStatus(`Aggregator deployed at ${aggAddr}`);
      }

      const newModuleAddresses: Record<string, string> = { ...moduleAddresses };

      for (const module of selectedModules) {
        if (module.id === 'whitelist' && module.deployable) {
          setDeployStatus('Deploying WhitelistModule...');
          const factory = new ethers.ContractFactory(whitelistArtifact.abi, whitelistArtifact.bytecode.object ?? whitelistArtifact.bytecode, signer);
          const contract = await factory.deploy(aggAddr);
          setDeployTxs((prev) => [...prev, `Whitelist tx: ${contract.deploymentTransaction()?.hash ?? ''}`]);
          await contract.waitForDeployment();
          newModuleAddresses[module.id] = await contract.getAddress();
        } else if (module.id === 'dynamic-fee' && module.deployable) {
          setDeployStatus('Deploying DynamicFeeModule...');
          const factory = new ethers.ContractFactory(dynamicFeeArtifact.abi, dynamicFeeArtifact.bytecode.object ?? dynamicFeeArtifact.bytecode, signer);
          const contract = await factory.deploy(aggAddr, 500, 3000, 1000, 200);
          setDeployTxs((prev) => [...prev, `DynamicFee tx: ${contract.deploymentTransaction()?.hash ?? ''}`]);
          await contract.waitForDeployment();
          newModuleAddresses[module.id] = await contract.getAddress();
        } else if (moduleAddresses[module.id]) {
          newModuleAddresses[module.id] = moduleAddresses[module.id];
        } else if (module.address) {
          newModuleAddresses[module.id] = module.address;
        }
      }

      setModuleAddresses(newModuleAddresses);

      setDeployStatus('Calling setModules...');
      const configs = selectedModules.map((module) => ({
        module: newModuleAddresses[module.id] ?? module.address,
        hooks: getHooksBitmap(module),
        critical: moduleConfigs[module.id]?.critical ?? false,
        priority: moduleConfigs[module.id]?.priority ?? 50,
        gasLimit: moduleConfigs[module.id]?.gasLimit ?? module.gas.gasBudget ?? 0,
      }));

      const aggSigner = new ethers.Contract(aggAddr, aggregatorArtifact.abi, signer);
      const setTx = await aggSigner.setModules(configs);
      setDeployTxs((prev) => [...prev, `setModules tx: ${setTx.hash}`]);
      await setTx.wait();

      const modulesView = await aggSigner.getModules();
      const routeIndices = modulesView.map((m: any, idx: number) => ({ idx, module: m.module.toLowerCase() }));
      const fallbackModuleIdx =
        routeMode === 'ALL'
          ? routeIndices[routeIndices.length - 1]?.idx ?? 0
          : routeIndices.find((m: any) => m.module === (newModuleAddresses['dynamic-fee'] ?? '').toLowerCase())?.idx ?? 0;

      const routeTx = await aggSigner.setRoute('0xbaddcafe', [fallbackModuleIdx], routeMode === 'ALL' ? 1 : 0);
      setDeployTxs((prev) => [...prev, `setRoute tx: ${routeTx.hash}`]);
      await routeTx.wait();

      setDeployStatus('Deployment complete.');
    } catch (err: any) {
      console.error(err);
      setDeployStatus(err?.message ?? 'Deploy failed');
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="min-h-screen text-ink bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 w-full border-b-2 border-black bg-white z-50 px-4 md:px-8 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-black" />
          <span className="font-black text-lg tracking-tight lowercase">modl</span>
          <span className="text-[9px] font-bold uppercase text-gray-500">demo</span>
        </div>
        <div className="flex items-center gap-2">
          <a href="https://github.com/migarci2/modl" target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold underline">
            GitHub
          </a>
          <span className="text-[10px] font-bold bg-pink-400 px-2 py-0.5 border-2 border-black">
            {selectedModules.length} modules
          </span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 md:px-6 pt-16 pb-12 space-y-8">
        {/* Hero */}
        <NeoCard className="bg-white">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                <HeroBadge color="bg-pink-400 text-black">modl</HeroBadge>
                <HeroBadge color="bg-cyan-400 text-black">uniswap v4</HeroBadge>
                <HeroBadge color="bg-yellow-300 text-black">hooks</HeroBadge>
              </div>
              <h1 className="text-3xl md:text-4xl font-black uppercase leading-tight">
                Deploy hooks with reusable modules
              </h1>
              <p className="text-sm text-gray-600 max-w-lg">
                Orchestrate MODL library modules or bring your own. Set priorities, estimate gas, and deploy.
              </p>
              <div className="flex flex-wrap gap-2">
                <NeoButton onClick={() => document.getElementById('composer')?.scrollIntoView({ behavior: 'smooth' })} color="bg-pink-400">
                  <Rocket size={14} /> Compose
                </NeoButton>
                <NeoButton onClick={() => document.getElementById('marketplace')?.scrollIntoView({ behavior: 'smooth' })} color="bg-cyan-400">
                  <ArrowRight size={14} /> Modules
                </NeoButton>
              </div>
            </div>

            <NeoCard className="min-w-[200px] max-w-xs bg-amber-100">
              <div className="text-[10px] font-bold uppercase mb-2 flex items-center gap-1 text-amber-800">
                <Gauge size={12} /> Gas
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div><span className="font-bold">Swap:</span> {gasEstimates.perSwap.toLocaleString()}</div>
                <div><span className="font-bold">Liq:</span> {gasEstimates.perLiquidity.toLocaleString()}</div>
                <div><span className="font-bold">Deploy:</span> {gasEstimates.deploy.toLocaleString()}</div>
                <div><span className="font-bold">Cost:</span> {gasEstimates.costPerSwapEth.toFixed(4)} ETH</div>
              </div>
            </NeoCard>
          </div>
        </NeoCard>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          <NeoCard className="bg-emerald-200">
            <div className="text-[10px] font-bold uppercase flex items-center gap-1"><ShieldCheck size={12} /> Safety</div>
            <p className="text-2xl font-black mt-1">{gasEstimates.criticalCount}</p>
            <p className="text-[9px] text-gray-600 uppercase">critical</p>
          </NeoCard>
          <NeoCard className="bg-cyan-200">
            <div className="text-[10px] font-bold uppercase flex items-center gap-1"><LayoutTemplate size={12} /> Active</div>
            <p className="text-2xl font-black mt-1">{selectedModules.length}<span className="text-sm text-gray-500">/16</span></p>
            <p className="text-[9px] text-gray-600 uppercase">modules</p>
          </NeoCard>
          <NeoCard className="bg-amber-200">
            <div className="text-[10px] font-bold uppercase flex items-center gap-1"><Gauge size={12} /> Budget</div>
            <p className="text-2xl font-black mt-1">{(gasEstimates.configuredBudget / 1000).toFixed(0)}k</p>
            <p className="text-[9px] text-gray-600 uppercase">gas limit</p>
          </NeoCard>
        </div>

        {/* Two-column layout: Config left, Marketplace right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Composer + Stack */}
          <div className="lg:col-span-2 space-y-6">
            {/* Composer */}
            <section id="composer" className="space-y-4">
              <SectionTitle title="Composer" kicker="deploy" />
              <NeoCard className="bg-white">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase">Network</span>
                    <select
                      value={network}
                      onChange={(e) => {
                        const net = e.target.value;
                        setNetwork(net);
                        if (POOL_MANAGERS[net]) {
                          setPoolManager(POOL_MANAGERS[net]);
                        }
                      }}
                      className="border-2 border-black px-2 py-1.5 bg-white font-mono text-xs"
                    >
                      <option value="sepolia">Sepolia</option>
                      <option value="mainnet">Mainnet</option>
                      <option value="unichain">Unichain</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase">Gas price (gwei)</span>
                    <input
                      type="number"
                      min={1}
                      value={gasPrice}
                      onChange={(e) => setGasPrice(Number(e.target.value) || 1)}
                      className="border-2 border-black px-2 py-1.5 bg-white font-mono text-xs"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase">PoolManager</span>
                    <input
                      value={poolManager}
                      onChange={(e) => setPoolManager(e.target.value)}
                      className="border-2 border-black px-2 py-1.5 bg-white font-mono text-xs"
                      placeholder="0x..."
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase">Aggregator (optional)</span>
                    <input
                      value={aggregatorAddress}
                      onChange={(e) => setAggregatorAddress(e.target.value)}
                      className="border-2 border-black px-2 py-1.5 bg-white font-mono text-xs"
                      placeholder="0x..."
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase">ExecMode</span>
                    <select
                      value={routeMode}
                      onChange={(e) => setRouteMode(e.target.value as 'ALL' | 'FIRST')}
                      className="border-2 border-black px-2 py-1.5 bg-white font-mono text-xs"
                    >
                      <option value="ALL">ALL</option>
                      <option value="FIRST">FIRST</option>
                    </select>
                  </label>
                </div>
              </NeoCard>

              <NeoCard className="bg-violet-100 space-y-3">
                <div className="text-[10px] font-bold uppercase flex items-center gap-1 text-violet-800">
                  <Gauge size={12} /> Estimate
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-white p-2 border border-black">
                    <span className="font-bold uppercase">Swap</span>
                    <p className="font-bold">{gasEstimates.perSwap.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-2 border border-black">
                    <span className="font-bold uppercase">Liq</span>
                    <p className="font-bold">{gasEstimates.perLiquidity.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-2 border border-black">
                    <span className="font-bold uppercase">Deploy</span>
                    <p className="font-bold">{gasEstimates.deploy.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-2 border border-black">
                    <span className="font-bold uppercase">Budget</span>
                    <p className="font-bold">{(gasEstimates.configuredBudget / 1000).toFixed(0)}k</p>
                  </div>
                </div>
                <div className="text-[9px] font-mono bg-black text-white p-2">
                  {routePreview}
                </div>
                {gasEstimates.warnings.length > 0 && (
                  <div className="space-y-1">
                    {gasEstimates.warnings.map((msg) => (
                      <div key={msg} className="text-[9px] bg-orange-100 p-1 border border-black flex items-start gap-1">
                        <AlertTriangle size={10} /> {msg}
                      </div>
                    ))}
                  </div>
                )}
              </NeoCard>
            </section>

            {/* Selected stack */}
            <section className="space-y-4">
              <SectionTitle title="Active stack" kicker="modules" />
              <NeoCard className="space-y-4 bg-white/90">
                {selectedModules.length === 0 && <p className="text-sm text-gray-700">Add modules to begin.</p>}
                {selectedModules.map((module) => (
                  <div key={module.id} className="border-2 border-black bg-white shadow-neo-sm p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-tight">#{module.id}</p>
                        <h3 className="text-lg font-black">{module.name}</h3>
                        <p className="text-sm text-gray-700">{module.description}</p>
                      </div>
                      <button
                        onClick={() => toggleModule(module.id)}
                        className="pill bg-white hover:-translate-y-[1px] transition"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                      <label className="flex flex-col gap-2 md:col-span-3">
                        <span className="text-[11px] font-black uppercase tracking-tight">Module address</span>
                        <input
                          value={moduleAddresses[module.id] ?? ''}
                          onChange={(e) => setModuleAddresses((prev) => ({ ...prev, [module.id]: e.target.value }))}
                          className="border-2 border-black px-3 py-2 bg-white shadow-neo-sm font-mono"
                          placeholder="0x..."
                        />
                        <span className="text-[11px] text-gray-600">
                          {module.deployable ? 'If empty, the app will deploy a fresh instance.' : 'Provide a deployed address for this module.'}
                        </span>
                      </label>
                      <label className="flex flex-col gap-2">
                        <span className="text-[11px] font-black uppercase tracking-tight">GasLimit</span>
                        <input
                          type="number"
                          value={moduleConfigs[module.id]?.gasLimit ?? module.gas.gasBudget ?? 0}
                          onChange={(e) => updateConfig(module.id, { gasLimit: Number(e.target.value) || 0 })}
                          className="border-2 border-black px-3 py-2 bg-white shadow-neo-sm font-mono"
                        />
                      </label>
                      <label className="flex flex-col gap-2">
                        <span className="text-[11px] font-black uppercase tracking-tight">Priority</span>
                        <input
                          type="range"
                          min={1}
                          max={100}
                          value={moduleConfigs[module.id]?.priority ?? 50}
                          onChange={(e) => updateConfig(module.id, { priority: Number(e.target.value) })}
                          className="accent-black"
                        />
                        <div className="text-xs font-mono">
                          {moduleConfigs[module.id]?.priority ?? 50}
                        </div>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={moduleConfigs[module.id]?.critical ?? false}
                          onChange={(e) => updateConfig(module.id, { critical: e.target.checked })}
                          className="w-5 h-5 border-2 border-black"
                        />
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-tight">Critical</p>
                          <p className="text-xs text-gray-700">Reverts the whole call if it fails.</p>
                        </div>
                      </label>
                    </div>

                    {/* Constructor parameters for deployable modules */}
                    {module.constructorParams && module.constructorParams.length > 0 && (
                      <div className={`mt-3 p-3 border border-black ${!moduleAddresses[module.id]
                        ? 'bg-gradient-to-r from-amber-50 to-orange-50'
                        : 'bg-gray-100 opacity-60'
                        }`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-black uppercase text-amber-800">
                            Constructor Parameters
                          </p>
                          {moduleAddresses[module.id] && (
                            <span className="text-[9px] bg-gray-300 px-2 py-0.5 border border-black">
                              Using existing contract
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {module.constructorParams.map((param) => (
                            <label key={param.name} className="flex flex-col gap-1">
                              <span className="text-[9px] font-bold uppercase text-gray-700" title={param.description}>
                                {param.label}
                              </span>
                              {param.type === 'address' ? (
                                <input
                                  type="text"
                                  value={
                                    String(moduleConfigs[module.id]?.constructorArgs?.[param.name] ?? param.default)
                                  }
                                  onChange={(e) => {
                                    const currentArgs = moduleConfigs[module.id]?.constructorArgs ?? {};
                                    updateConfig(module.id, {
                                      constructorArgs: { ...currentArgs, [param.name]: e.target.value },
                                    });
                                  }}
                                  disabled={!!moduleAddresses[module.id]}
                                  className="border border-black px-2 py-1 bg-white text-xs font-mono disabled:bg-gray-200"
                                  placeholder="0x..."
                                />
                              ) : (
                                <input
                                  type="number"
                                  value={
                                    Number(moduleConfigs[module.id]?.constructorArgs?.[param.name] ?? param.default)
                                  }
                                  onChange={(e) => {
                                    const currentArgs = moduleConfigs[module.id]?.constructorArgs ?? {};
                                    updateConfig(module.id, {
                                      constructorArgs: { ...currentArgs, [param.name]: Number(e.target.value) },
                                    });
                                  }}
                                  disabled={!!moduleAddresses[module.id]}
                                  className="border border-black px-2 py-1 bg-white text-xs font-mono disabled:bg-gray-200"
                                />
                              )}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </NeoCard>
            </section>
          </div>

          {/* Right column: Marketplace (sticky) */}
          <div className="lg:col-span-1">
            <div className="sticky top-16">
              <SectionTitle title="Modules" kicker="add" />
              <div id="marketplace" className="space-y-3 max-h-[calc(100vh-8rem)] overflow-y-auto mt-3">
                {moduleCatalog.map((module) => (
                  <ModuleCard
                    key={module.id}
                    module={module}
                    selected={selectedModuleIds.includes(module.id)}
                    onToggle={toggleModule}
                  />
                ))}
              </div>

              <NeoCard className="bg-gradient-to-br from-pink-100 to-violet-100 space-y-3 mt-4 mb-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase">
                  <Braces size={14} /> Custom module
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={customDraft.name}
                    onChange={(e) => setCustomDraft((prev) => ({ ...prev, name: e.target.value }))}
                    className="border-2 border-black px-2 py-1 bg-white text-xs font-mono col-span-2"
                    placeholder="Name"
                  />
                  <input
                    value={customDraft.address}
                    onChange={(e) => setCustomDraft((prev) => ({ ...prev, address: e.target.value }))}
                    className="border-2 border-black px-2 py-1 bg-white text-xs font-mono col-span-2"
                    placeholder="0x... address"
                  />
                  <input
                    type="number"
                    value={customDraft.gasLimit}
                    onChange={(e) => setCustomDraft((prev) => ({ ...prev, gasLimit: Number(e.target.value) }))}
                    className="border-2 border-black px-2 py-1 bg-white text-xs font-mono"
                    placeholder="Gas limit"
                  />
                  <select
                    value={customDraft.risk}
                    onChange={(e) => setCustomDraft((prev) => ({ ...prev, risk: e.target.value as ModuleSpec['risk'] }))}
                    className="border-2 border-black px-2 py-1 bg-white text-xs font-mono"
                  >
                    <option value="low">Low risk</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-bold uppercase">Hooks</span>
                  <div className="flex flex-wrap gap-1">
                    {['beforeSwap', 'afterSwap', 'beforeAddLiquidity', 'afterAddLiquidity', 'beforeRemoveLiquidity', 'afterRemoveLiquidity', 'donate'].map((hook) => (
                      <label key={hook} className="flex items-center gap-1 text-[9px] bg-white px-1.5 py-0.5 border border-black cursor-pointer hover:bg-gray-100">
                        <input
                          type="checkbox"
                          checked={customDraft.hooks.includes(hook)}
                          onChange={(e) => {
                            const hooks = customDraft.hooks.split(',').map(h => h.trim()).filter(Boolean);
                            if (e.target.checked) {
                              hooks.push(hook);
                            } else {
                              const idx = hooks.indexOf(hook);
                              if (idx > -1) hooks.splice(idx, 1);
                            }
                            setCustomDraft((prev) => ({ ...prev, hooks: hooks.join(', ') }));
                          }}
                          className="w-3 h-3"
                        />
                        {hook}
                      </label>
                    ))}
                  </div>
                </div>
                <button onClick={addCustomModule} className="w-full bg-pink-400 text-black font-bold text-xs py-2 border-2 border-black hover:bg-pink-500 transition flex items-center justify-center gap-2">
                  <Wand2 size={14} /> Add custom module
                </button>
              </NeoCard>
            </div>
          </div>
        </div>
      </div >

      {/* Deploy section */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 pb-12">
        <section id="preview" className="space-y-4">
          <SectionTitle title="Deploy" kicker="launch" />

          {/* Deploy card */}
          <NeoCard className="bg-gradient-to-r from-pink-200 to-violet-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black">Deploy your hook</h3>
                <p className="text-xs text-gray-700">
                  {selectedModules.length} modules • {routeMode} mode • {requiredHookFlags.flagCount} hook flags
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={ensureProvider}
                  className="bg-black text-white text-xs font-bold px-3 py-2 border-2 border-black disabled:opacity-60"
                  disabled={isDeploying}
                >
                  {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Connect'}
                </button>
                {walletAddress && (
                  <button
                    onClick={async () => {
                      try {
                        await (window as any).ethereum.request({
                          method: 'wallet_requestPermissions',
                          params: [{ eth_accounts: {} }],
                        });
                        // Re-connect to get new account
                        await ensureProvider();
                      } catch (e) {
                        console.log('User cancelled account switch');
                      }
                    }}
                    className="bg-gray-200 text-black text-xs font-bold px-2 py-2 border-2 border-black hover:bg-gray-300"
                    title="Switch MetaMask account"
                  >
                    🔄
                  </button>
                )}
                <button
                  onClick={deployWithMetaMask}
                  className="bg-pink-400 text-black text-xs font-bold px-4 py-2 border-2 border-black hover:bg-pink-500 transition disabled:opacity-50"
                  disabled={isDeploying || selectedModules.length === 0}
                >
                  {isDeploying ? 'Mining...' : '🚀 Deploy'}
                </button>
              </div>
            </div>

            {/* Hook mining info */}
            <div className="bg-white/50 border border-black p-3 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase">Hook Mining</span>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 border border-black font-bold ${requiredHookFlags.difficulty === 'Instant' ? 'bg-emerald-300' :
                    requiredHookFlags.difficulty === 'Fast' ? 'bg-green-300' :
                      requiredHookFlags.difficulty === 'Medium' ? 'bg-amber-300' :
                        'bg-red-300'
                    }`}>
                    {requiredHookFlags.difficulty}
                  </span>
                  <button
                    onClick={() => {
                      // Demo mining with dummy bytecode - in real use, load actual bytecode
                      const dummyBytecode = '0x608060405234801561001057600080fd5b50';
                      const result = mineHookAddressSync('0x4e59b44847b379578588920cA78FbF26c0B4956C', requiredHookFlags.flags, dummyBytecode);
                      if (result) {
                        setMinedSalt(result.salt);
                        setMinedAddress(result.hookAddress);
                        setDeployStatus(`Mined in ${result.iterations} iterations`);
                      } else {
                        setDeployStatus('Mining failed - try again');
                      }
                    }}
                    className="bg-cyan-400 text-black text-[10px] font-bold px-2 py-1 border border-black hover:bg-cyan-500"
                    disabled={selectedModules.length === 0}
                  >
                    ⛏️ Mine
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {requiredHookFlags.allHooks.map((hook) => (
                  <span key={hook} className="text-[9px] bg-violet-200 px-1.5 py-0.5 border border-black font-mono">
                    {hook}
                  </span>
                ))}
              </div>
              {minedAddress && (
                <div className="bg-emerald-100 border border-black p-2 space-y-2">
                  <p className="text-[10px] font-bold text-emerald-800">✓ Address found!</p>
                  <p className="text-[9px] font-mono break-all">
                    {minedAddress.slice(0, -4)}
                    <span className="bg-emerald-400 text-black font-bold px-0.5">{minedAddress.slice(-4)}</span>
                  </p>
                  <div className="flex items-center gap-2 text-[9px]">
                    <span className="text-gray-600">Target:</span>
                    <span className="font-mono bg-violet-300 px-1 border border-black">
                      ...{requiredHookFlags.flags.toString(16).padStart(4, '0')}
                    </span>
                    <span className="text-emerald-700">✓ Match</span>
                  </div>
                  <p className="text-[9px] text-gray-600">Salt: {minedSalt?.slice(0, 18)}...</p>
                </div>
              )}
              <p className="text-[10px] text-gray-600">
                Flags: 0x{requiredHookFlags.flags.toString(16).padStart(4, '0')} •
                Binary: {requiredHookFlags.flags.toString(2).padStart(14, '0')}
              </p>
            </div>

            {chainId && (
              <div className="flex items-center gap-2 text-xs">
                <span className="bg-emerald-300 px-2 py-0.5 border border-black font-bold">Chain {chainId}</span>
                <span className="bg-amber-200 px-2 py-0.5 border border-black font-mono">{network}</span>
              </div>
            )}

            {deployStatus && (
              <div className="bg-white border-2 border-black p-3 text-xs space-y-2">
                <p className="font-bold">{deployStatus}</p>
                {deployTxs.length > 0 && (
                  <ul className="space-y-1 font-mono text-[10px]">
                    {deployTxs.map((tx) => (
                      <li key={tx} className="break-all bg-gray-100 p-1">{tx}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </NeoCard>

          {/* Payload preview - collapsible */}
          <details className="group">
            <summary className="cursor-pointer text-xs font-bold uppercase flex items-center gap-2 py-2">
              <Braces size={14} /> View payload & config
            </summary>
            <NeoCard className="bg-gray-900 mt-2 space-y-3">
              <pre className="text-[10px] overflow-x-auto text-emerald-400">{hookDataPreview}</pre>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div className="bg-gray-800 p-2">
                  <span className="text-gray-400">PoolManager</span>
                  <p className="font-mono text-white truncate">{poolManager ? `${poolManager.slice(0, 10)}...` : '(not set)'}</p>
                </div>
                <div className="bg-gray-800 p-2">
                  <span className="text-gray-400">Mined Salt</span>
                  <p className="font-mono text-white truncate">{minedSalt ? `${minedSalt.slice(0, 10)}...` : '(mine first)'}</p>
                </div>
                <div className="bg-gray-800 p-2">
                  <span className="text-gray-400">Hook Address</span>
                  <p className="font-mono text-white truncate">{minedAddress ? `${minedAddress.slice(0, 10)}...` : '(mine first)'}</p>
                </div>
              </div>
            </NeoCard>
          </details>
        </section>
      </div>
    </div>
  );
}
