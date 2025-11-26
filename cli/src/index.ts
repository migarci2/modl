#!/usr/bin/env node
import { Command } from "commander";
import { init } from "./commands/init";
import { templateList } from "./commands/templateList";
import { moduleNew } from "./commands/moduleNew";
import { logger } from "./utils/logger";

const program = new Command();

program.name("modl").description("CLI for building MODL modules and tests").version("0.1.0");

program
  .command("init")
  .description("Initialize modl configuration in this project")
  .option("-f, --force", "Overwrite existing modl.config.json", false)
  .action(async (opts) => {
    try {
      await init({ force: opts.force });
    } catch (err) {
      handleError(err);
    }
  });

program
  .command("template:list")
  .description("List available module templates")
  .action(async () => {
    try {
      await templateList();
    } catch (err) {
      handleError(err);
    }
  });

program
  .command("module:new")
  .argument("<name>", "Contract name for the new module")
  .option("-t, --template <template>", "Template name")
  .option("-f, --force", "Overwrite files if they exist", false)
  .description("Create a new module and test file from a template")
  .action(async (name, opts) => {
    try {
      await moduleNew(name, { template: opts.template, force: opts.force });
    } catch (err) {
      handleError(err);
    }
  });

program.parse(process.argv);

function handleError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  logger.error(message);
  process.exitCode = 1;
}
