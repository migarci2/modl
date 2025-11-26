import { promises as fs } from "fs";
import * as path from "path";
import { fileExists } from "./fs";

export type ProjectType = "foundry" | "hardhat" | "unknown";

export async function detectProjectType(cwd: string): Promise<ProjectType> {
  if (await fileExists(path.join(cwd, "foundry.toml"))) {
    return "foundry";
  }

  if (await hasHardhatConfig(cwd)) {
    return "hardhat";
  }

  return "unknown";
}

async function hasHardhatConfig(cwd: string): Promise<boolean> {
  const hardhatFiles = ["hardhat.config.js", "hardhat.config.ts"];
  for (const file of hardhatFiles) {
    if (await fileExists(path.join(cwd, file))) return true;
  }

  const pkgPath = path.join(cwd, "package.json");
  if (await fileExists(pkgPath)) {
    const pkgRaw = await fs.readFile(pkgPath, "utf8");
    const pkg = JSON.parse(pkgRaw);
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    if (deps.hardhat) return true;
  }

  return false;
}
