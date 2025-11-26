import { listTemplates } from "../utils/templates";
import { logger } from "../utils/logger";

export async function templateList() {
  const templates = await listTemplates();
  if (templates.length === 0) {
    logger.warn("No templates found.");
    return;
  }

  logger.info("Available templates:");
  for (const tpl of templates) {
    const desc = tpl.description ? ` - ${tpl.description}` : "";
    logger.info(`  ${tpl.name}${desc}`);
  }
}
