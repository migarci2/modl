export function renderTemplate(content: string, replacements: Record<string, string>): string {
  let rendered = content;
  for (const [key, value] of Object.entries(replacements)) {
    const token = new RegExp(escapeRegExp(key), "g");
    rendered = rendered.replace(token, value);
  }
  return rendered;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
