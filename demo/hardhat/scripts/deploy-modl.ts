import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

type ModuleHooks = {
  beforeInitialize: boolean;
  afterInitialize: boolean;
  beforeAddLiquidity: boolean;
  afterAddLiquidity: boolean;
  beforeRemoveLiquidity: boolean;
  afterRemoveLiquidity: boolean;
  beforeSwap: boolean;
  afterSwap: boolean;
  beforeDonate: boolean;
  afterDonate: boolean;
};

type ModuleConfigInput = {
  module: string;
  hooks: ModuleHooks;
  critical: boolean;
  priority: number;
  gasLimit: number;
};

const artifactsRoot = path.join(__dirname, "..", "..", "..", "out");

function readArtifact(contractName: string) {
  const artifactPath = path.join(artifactsRoot, `${contractName}.sol`, `${contractName}.json`);
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found for ${contractName}. Run "forge build" from repo root first.`);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const bytecode: string = artifact.bytecode.object ?? artifact.bytecode;
  return { abi: artifact.abi, bytecode };
}

async function deployFromArtifact(contractName: string, args: unknown[], signer: any) {
  const { abi, bytecode } = readArtifact(contractName);
  const factory = new ethers.ContractFactory(abi, bytecode, signer);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  return contract;
}

const whitelistHooks: ModuleHooks = {
  beforeInitialize: true,
  afterInitialize: true,
  beforeAddLiquidity: true,
  afterAddLiquidity: true,
  beforeRemoveLiquidity: true,
  afterRemoveLiquidity: true,
  beforeSwap: true,
  afterSwap: true,
  beforeDonate: true,
  afterDonate: true,
};

const dynamicFeeHooks: ModuleHooks = {
  beforeInitialize: false,
  afterInitialize: false,
  beforeAddLiquidity: false,
  afterAddLiquidity: true,
  beforeRemoveLiquidity: false,
  afterRemoveLiquidity: true,
  beforeSwap: true,
  afterSwap: true,
  beforeDonate: false,
  afterDonate: false,
};

async function main() {
  const poolManager = process.env.POOL_MANAGER;
  if (!poolManager) throw new Error("Missing POOL_MANAGER in .env");

  const minFee = Number(process.env.MIN_FEE ?? 500);
  const maxFee = Number(process.env.MAX_FEE ?? 3000);
  const baseFee = Number(process.env.BASE_FEE ?? 1000);
  const volMult = Number(process.env.VOL_MULT ?? 200);
  const selector = (process.env.ROUTE_SELECTOR ?? "0xbaddcafe") as `0x${string}`;

  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("No signer available. Set PRIVATE_KEY in .env");

  const network = await ethers.provider.getNetwork();
  console.log(`\nNetwork: ${network.name} (${network.chainId})`);
  console.log(`Deployer: ${await deployer.getAddress()}`);
  console.log(`PoolManager: ${poolManager}`);

  console.log("\nDeploying MODLAggregator...");
  const aggregator = await deployFromArtifact("MODLAggregator", [poolManager, []], deployer);
  const aggregatorAddress = await aggregator.getAddress();
  console.log(`MODLAggregator => ${aggregatorAddress}`);

  console.log("Deploying WhitelistModule...");
  const whitelist = await deployFromArtifact("WhitelistModule", [aggregatorAddress], deployer);
  const whitelistAddress = await whitelist.getAddress();
  console.log(`WhitelistModule => ${whitelistAddress}`);

  console.log("Deploying DynamicFeeModule...");
  const dynamicFee = await deployFromArtifact("DynamicFeeModule", [aggregatorAddress, minFee, maxFee, baseFee, volMult], deployer);
  const dynamicFeeAddress = await dynamicFee.getAddress();
  console.log(`DynamicFeeModule => ${dynamicFeeAddress}`);

  const moduleConfigs: ModuleConfigInput[] = [
    {
      module: whitelistAddress,
      hooks: whitelistHooks,
      critical: true,
      priority: 10,
      gasLimit: 90_000,
    },
    {
      module: dynamicFeeAddress,
      hooks: dynamicFeeHooks,
      critical: false,
      priority: 20,
      gasLimit: 120_000,
    },
  ];

  console.log("\nSetting modules on aggregator...");
  const setTx = await aggregator.setModules(moduleConfigs);
  await setTx.wait();
  const modulesView = (await aggregator.getModules()) as any[];
  modulesView.forEach((m, idx) => {
    console.log(`  [${idx}] ${m.module} priority=${m.priority} critical=${m.critical}`);
  });

  const dynamicIndex = modulesView.findIndex((m) => m.module.toLowerCase() === dynamicFeeAddress.toLowerCase());
  if (dynamicIndex >= 0 && selector !== "0x00000000") {
    console.log(`Configuring fallback route ${selector} -> module index ${dynamicIndex} (ExecMode.ALL)`);
    const routeTx = await aggregator.setRoute(selector, [dynamicIndex], 1);
    await routeTx.wait();
  } else {
    console.log("Skipping route setup (no selector or module index not found).");
  }

  console.log("\nDeployment complete:");
  console.log(`  Aggregator:   ${aggregatorAddress}`);
  console.log(`  Whitelist:    ${whitelistAddress}`);
  console.log(`  DynamicFee:   ${dynamicFeeAddress}`);
  console.log(`\nReminder: set whitelist entries and dynamic fee parameters after deploy.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
