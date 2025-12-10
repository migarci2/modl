import { ethers } from 'ethers';

// Hook flags from Uniswap v4 Hooks.sol - bottom 14 bits of address
export const HOOK_FLAGS = {
	BEFORE_INITIALIZE: 1 << 13,
	AFTER_INITIALIZE: 1 << 12,
	BEFORE_ADD_LIQUIDITY: 1 << 11,
	AFTER_ADD_LIQUIDITY: 1 << 10,
	BEFORE_REMOVE_LIQUIDITY: 1 << 9,
	AFTER_REMOVE_LIQUIDITY: 1 << 8,
	BEFORE_SWAP: 1 << 7,
	AFTER_SWAP: 1 << 6,
	BEFORE_DONATE: 1 << 5,
	AFTER_DONATE: 1 << 4,
	BEFORE_SWAP_RETURNS_DELTA: 1 << 3,
	AFTER_SWAP_RETURNS_DELTA: 1 << 2,
	AFTER_ADD_LIQUIDITY_RETURNS_DELTA: 1 << 1,
	AFTER_REMOVE_LIQUIDITY_RETURNS_DELTA: 1 << 0,
} as const;

// Flag mask for bottom 14 bits
const FLAG_MASK = (1 << 14) - 1; // 0x3FFF

// CREATE2 Deployer Proxy address (standard across networks)
export const CREATE2_DEPLOYER = '0x4e59b44847b379578588920cA78FbF26c0B4956C';

// Maximum iterations to find a salt
const MAX_ITERATIONS = 500_000;

/**
 * Maps hook names to their corresponding flags
 * Recognizes various naming conventions
 */
export function hookNamesToFlags(hooks: string[]): number {
	let flags = 0;
	for (const hook of hooks) {
		const normalized = hook.trim().toLowerCase().replace(/[\s_-]/g, '');

		// Swap hooks
		if (normalized === 'beforeswap' || normalized === 'swap') flags |= HOOK_FLAGS.BEFORE_SWAP;
		if (normalized === 'afterswap') flags |= HOOK_FLAGS.AFTER_SWAP;

		// Liquidity hooks
		if (normalized === 'beforeaddliquidity' || normalized === 'addliquidity' || normalized === 'liquidity') {
			flags |= HOOK_FLAGS.BEFORE_ADD_LIQUIDITY;
		}
		if (normalized === 'afteraddliquidity') flags |= HOOK_FLAGS.AFTER_ADD_LIQUIDITY;
		if (normalized === 'beforeremoveliquidity' || normalized === 'removeliquidity') {
			flags |= HOOK_FLAGS.BEFORE_REMOVE_LIQUIDITY;
		}
		if (normalized === 'afterremoveliquidity') flags |= HOOK_FLAGS.AFTER_REMOVE_LIQUIDITY;

		// Donate hooks
		if (normalized === 'beforedonate' || normalized === 'donate' || normalized === 'donations') {
			flags |= HOOK_FLAGS.BEFORE_DONATE;
		}
		if (normalized === 'afterdonate') flags |= HOOK_FLAGS.AFTER_DONATE;

		// Initialize hooks
		if (normalized === 'beforeinitialize' || normalized === 'initialize') {
			flags |= HOOK_FLAGS.BEFORE_INITIALIZE;
		}
		if (normalized === 'afterinitialize') flags |= HOOK_FLAGS.AFTER_INITIALIZE;
	}
	return flags;
}

/**
 * Converts number to uint256 hex string (64 chars)
 */
function numberToUint256(value: number): string {
	const hex = value.toString(16);
	return '0x' + '0'.repeat(64 - hex.length) + hex;
}

/**
 * Compute CREATE2 address deterministically
 * address = keccak256(0xff ++ deployer ++ salt ++ keccak256(bytecode))[12:]
 */
export function computeCreate2Address(
	deployer: string,
	salt: string,
	bytecode: string
): string {
	const bytecodeHash = ethers.keccak256(bytecode);

	// Pack: 0xff + deployer + salt + bytecodeHash
	const packed = ethers.concat([
		'0xff',
		deployer,
		salt,
		bytecodeHash
	]);

	const hash = ethers.keccak256(packed);
	// Take last 20 bytes (40 hex chars)
	return '0x' + hash.slice(-40);
}

/**
 * Alternative compute using solidityPacked
 */
export function computeCreate2AddressAlt(
	deployer: string,
	saltHex: string,
	bytecode: string
): string {
	const bytecodeHash = ethers.keccak256(bytecode);

	// Build the CREATE2 address manually
	const data = '0x' + [
		'ff',
		deployer.slice(2).toLowerCase(),
		saltHex.slice(2),
		bytecodeHash.slice(2)
	].join('');

	const hash = ethers.keccak256(data);
	return ('0x' + hash.slice(-40)).toLowerCase();
}

/**
 * Check if an address has the required flags in its bottom 14 bits
 */
export function addressMatchesFlags(address: string, flags: number): boolean {
	const addressBigInt = BigInt(address);
	const addressFlags = Number(addressBigInt & BigInt(FLAG_MASK));
	return addressFlags === (flags & FLAG_MASK);
}

/**
 * Mine a salt that produces a hook address with the desired flags
 */
export async function mineHookAddress(
	deployer: string,
	flags: number,
	bytecode: string,
	constructorArgs: string = '',
	onProgress?: (iteration: number, currentAddress: string) => void
): Promise<{ hookAddress: string; salt: string; iterations: number }> {
	// Combine bytecode with constructor args (remove 0x prefix from args)
	const fullBytecode = constructorArgs
		? bytecode + constructorArgs.slice(2)
		: bytecode;

	const targetFlags = flags & FLAG_MASK;

	console.log(`Mining hook address with flags: 0x${targetFlags.toString(16)} (${targetFlags.toString(2).padStart(14, '0')})`);

	for (let i = 0; i < MAX_ITERATIONS; i++) {
		const salt = numberToUint256(i);
		const hookAddress = computeCreate2AddressAlt(deployer, salt, fullBytecode);

		// Check if bottom 14 bits match desired flags
		const addressBigInt = BigInt(hookAddress);
		const addressFlags = Number(addressBigInt & BigInt(FLAG_MASK));

		if (addressFlags === targetFlags) {
			console.log(`Found valid address after ${i} iterations: ${hookAddress}`);
			return { hookAddress, salt, iterations: i };
		}

		// Progress callback every 5000 iterations
		if (onProgress && i % 5000 === 0 && i > 0) {
			onProgress(i, hookAddress);
		}

		// Yield to event loop every 10000 iterations to prevent UI freeze
		if (i % 10000 === 0) {
			await new Promise(resolve => setTimeout(resolve, 0));
		}
	}

	throw new Error(`HookMiner: Could not find salt after ${MAX_ITERATIONS} iterations`);
}

/**
 * Quick sync version for testing (limited iterations)
 */
export function mineHookAddressSync(
	deployer: string,
	flags: number,
	bytecode: string,
	constructorArgs: string = '',
	maxIterations: number = 50000
): { hookAddress: string; salt: string; iterations: number } | null {
	const fullBytecode = constructorArgs
		? bytecode + constructorArgs.slice(2)
		: bytecode;

	const targetFlags = flags & FLAG_MASK;

	for (let i = 0; i < maxIterations; i++) {
		const salt = numberToUint256(i);
		const hookAddress = computeCreate2AddressAlt(deployer, salt, fullBytecode);

		const addressBigInt = BigInt(hookAddress);
		const addressFlags = Number(addressBigInt & BigInt(FLAG_MASK));

		if (addressFlags === targetFlags) {
			return { hookAddress, salt, iterations: i };
		}
	}

	return null;
}

/**
 * Estimate mining difficulty based on number of flags set
 */
export function estimateMiningDifficulty(flags: number): {
	estimatedIterations: number;
	difficulty: string;
	flagCount: number;
} {
	const flagCount = (flags & FLAG_MASK).toString(2).split('1').length - 1;
	// Each bit has 50% chance, so ~2^n iterations on average
	const estimatedIterations = Math.pow(2, flagCount);

	let difficulty: string;
	if (estimatedIterations < 50) difficulty = 'Instant';
	else if (estimatedIterations < 500) difficulty = 'Fast';
	else if (estimatedIterations < 5000) difficulty = 'Medium';
	else if (estimatedIterations < 50000) difficulty = 'Slow';
	else difficulty = 'Very Slow';

	return { estimatedIterations, difficulty, flagCount };
}

/**
 * Get human-readable flag names from a flags number
 */
export function flagsToNames(flags: number): string[] {
	const names: string[] = [];
	if (flags & HOOK_FLAGS.BEFORE_INITIALIZE) names.push('beforeInitialize');
	if (flags & HOOK_FLAGS.AFTER_INITIALIZE) names.push('afterInitialize');
	if (flags & HOOK_FLAGS.BEFORE_ADD_LIQUIDITY) names.push('beforeAddLiquidity');
	if (flags & HOOK_FLAGS.AFTER_ADD_LIQUIDITY) names.push('afterAddLiquidity');
	if (flags & HOOK_FLAGS.BEFORE_REMOVE_LIQUIDITY) names.push('beforeRemoveLiquidity');
	if (flags & HOOK_FLAGS.AFTER_REMOVE_LIQUIDITY) names.push('afterRemoveLiquidity');
	if (flags & HOOK_FLAGS.BEFORE_SWAP) names.push('beforeSwap');
	if (flags & HOOK_FLAGS.AFTER_SWAP) names.push('afterSwap');
	if (flags & HOOK_FLAGS.BEFORE_DONATE) names.push('beforeDonate');
	if (flags & HOOK_FLAGS.AFTER_DONATE) names.push('afterDonate');
	return names;
}

/**
 * Validate that an address has the correct flags encoded
 */
export function validateHookAddress(address: string, expectedFlags: number): boolean {
	return addressMatchesFlags(address, expectedFlags);
}
