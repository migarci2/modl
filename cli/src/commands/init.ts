import { promises as fs } from "fs";
import * as path from "path";
import { CONFIG_FILE, defaultConfig, ModlConfig } from "../utils/config";
import { detectProjectType } from "../utils/project";
import { ensureDir, fileExists } from "../utils/fs";
import { logger } from "../utils/logger";

export type InitOptions = {
  force?: boolean;
};

export async function init(options: InitOptions = {}) {
  const cwd = process.cwd();
  const configPath = path.join(cwd, CONFIG_FILE);

  if (await fileExists(configPath) && !options.force) {
    logger.warn("modl.config.json already exists. Use --force to overwrite.");
    return;
  }

  const projectType = await detectProjectType(cwd);
  const config: ModlConfig = defaultConfig(projectType === "unknown" ? "foundry" : projectType);

  await fs.writeFile(configPath, JSON.stringify(config, null, 2) + "\n");
  await ensureDir(path.join(cwd, config.modulesDir));
  await ensureDir(path.join(cwd, config.testsDir));

  logger.success("Initialized modl.config.json and created module/test directories.");
  logger.info(`modulesDir: ${config.modulesDir}`);
  logger.info(`testsDir:   ${config.testsDir}`);
}
