import { promises as fs } from "fs";
import * as path from "path";
import { loadConfig, CONFIG_FILE } from "../utils/config";
import { ensureDir, fileExists, resolveRelative } from "../utils/fs";
import { renderTemplate } from "../utils/render";
import { logger } from "../utils/logger";
import { templatePath } from "../utils/templates";

export type ModuleNewOptions = {
  template?: string;
  force?: boolean;
};

export async function moduleNew(name: string, options: ModuleNewOptions = {}) {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);
  const templateName = options.template || config.defaultTemplate || "basic";
  const tplRoot = templatePath(templateName);

  const solTplPath = path.join(tplRoot, "Module.sol.tpl");
  const testTplPath = path.join(tplRoot, "Module.t.sol.tpl");

  if (!(await fileExists(solTplPath)) || !(await fileExists(testTplPath))) {
    throw new Error(`Template "${templateName}" is missing required files.`);
  }

  const solOut = resolveRelative(cwd, path.join(config.modulesDir, `${name}.sol`));
  const testOut = resolveRelative(cwd, path.join(config.testsDir, `${name}.t.sol`));

  if (!options.force) {
    await assertNotExists(solOut);
    await assertNotExists(testOut);
  }

  const replacements: Record<string, string> = {
    "{{MODULE_NAME}}": name,
    "{{MODULE_FILE_NAME}}": name
  };

  await ensureDir(path.dirname(solOut));
  await ensureDir(path.dirname(testOut));

  const solContent = await fs.readFile(solTplPath, "utf8");
  const testContent = await fs.readFile(testTplPath, "utf8");

  await fs.writeFile(solOut, renderTemplate(solContent, replacements));
  await fs.writeFile(testOut, renderTemplate(testContent, replacements));

  logger.success(`Created module ${name} from template "${templateName}".`);
  logger.info(`- ${path.relative(cwd, solOut)}`);
  logger.info(`- ${path.relative(cwd, testOut)}`);
}

async function assertNotExists(target: string) {
  if (await fileExists(target)) {
    throw new Error(`File already exists: ${target}. Use --force to overwrite.`);
  }
}
