import { promises as fs } from "fs";
import * as path from "path";
import { templatesRoot } from "./paths";
import { isDirectory } from "./fs";

export type TemplateInfo = {
  name: string;
  hasSol: boolean;
  hasTest: boolean;
  description?: string;
};

export async function listTemplates(): Promise<TemplateInfo[]> {
  const root = templatesRoot();
  const entries = await fs.readdir(root);
  const templates: TemplateInfo[] = [];
  for (const entry of entries) {
    const full = path.join(root, entry);
    if (!(await isDirectory(full))) continue;
    const solPath = path.join(full, "Module.sol.tpl");
    const testPath = path.join(full, "Module.t.sol.tpl");
    const info: TemplateInfo = {
      name: entry,
      hasSol: await fileExistsSafe(solPath),
      hasTest: await fileExistsSafe(testPath)
    };

    const metaPath = path.join(full, "meta.json");
    if (await fileExistsSafe(metaPath)) {
      try {
        const metaRaw = await fs.readFile(metaPath, "utf8");
        const meta = JSON.parse(metaRaw);
        info.description = meta.description;
      } catch {
        // ignore meta errors
      }
    }
    templates.push(info);
  }
  return templates;
}

export function templatePath(templateName: string): string {
  return path.join(templatesRoot(), templateName);
}

async function fileExistsSafe(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}
