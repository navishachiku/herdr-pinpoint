import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface Config {
  /** Text typed into the calling pane. Tokens: {name}, {label}, {id}. */
  outputTemplate: string;
}

export const DEFAULT_CONFIG: Config = {
  outputTemplate: "herdr:{name}({id})",
};

const TEMPLATE = `# herdr-target-picker
#
# Text typed into the pane you opened the picker from.
# Tokens:
#   {name}   pane name, else agent name, else agent kind, else "shell"
#            (spaces and tabs use their label)
#   {label}  what the picker shows, e.g. "hqcommit (claude)"
#   {id}     herdr id, e.g. w8:p1G
output_template = "${DEFAULT_CONFIG.outputTemplate}"
`;

/** Reads config.toml under the plugin config dir, writing the default first if absent. */
export function loadConfig(dir: string | undefined): Config {
  if (!dir) return DEFAULT_CONFIG;
  const path = join(dir, "config.toml");
  if (!existsSync(path)) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(path, TEMPLATE);
    return DEFAULT_CONFIG;
  }
  return parseConfig(readFileSync(path, "utf8"));
}

/** Only `key = "string"` lines are needed; a full TOML parser would be a dependency. */
export function parseConfig(text: string): Config {
  const values = new Map<string, string>();
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"((?:[^"\\]|\\.)*)"\s*(#.*)?$/);
    if (m) values.set(m[1], JSON.parse(`"${m[2]}"`));
  }
  return {
    outputTemplate: values.get("output_template") ?? DEFAULT_CONFIG.outputTemplate,
  };
}

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key) => vars[key] ?? whole);
}
