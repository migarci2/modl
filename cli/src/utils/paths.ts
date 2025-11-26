import * as path from "path";

export function cliRoot(): string {
  return path.resolve(__dirname, "..");
}

export function templatesRoot(): string {
  return path.join(cliRoot(), "templates");
}
