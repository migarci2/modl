import { promises as fs } from "fs";
import * as path from "path";
import { fileExists } from "./fs";

export type ModlConfig = {
  modulesDir: string;
  testsDir: string;
  defaultTemplate?: string;
  projectType?: string;
  solidityVersion?: string;
};

export const CONFIG_FILE = "modl.config.json";

export async function loadConfig(cwd: string): Promise<ModlConfig> {
  const configPath = path.join(cwd, CONFIG_FILE);
  if (!(await fileExists(configPath))) {
    throw new Error("modl.config.json not found. Run `modl init` first.");
  }
  const raw = await fs.readFile(configPath, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed.modulesDir || !parsed.testsDir) {
    throw new Error("Invalid modl.config.json: modulesDir and testsDir are required.");
  }
  return parsed as ModlConfig;
}

export function defaultConfig(projectType: string): ModlConfig {
  return {
    modulesDir: "src/modules",
    testsDir: "test/modules",
    defaultTemplate: "basic",
    projectType,
    solidityVersion: "0.8.26"
  };
}
