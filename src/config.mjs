import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** @typedef {{ outputTemplate: string }} Config  Text typed into the calling pane; tokens {name}, {label}, {id}. */

/** @type {Config} */
export const DEFAULT_CONFIG = {
  outputTemplate: "herdr:{name}({id})",
};

const TEMPLATE = `# herdr-pinpoint
#
# Text typed into the pane you opened the picker from.
# Tokens:
#   {name}   pane name, else agent name, else agent kind, else "shell"
#            (spaces and tabs use their label)
#   {label}  what the picker shows, e.g. "hqcommit (claude)"
#   {id}     herdr id, e.g. w8:p1G
output_template = "${DEFAULT_CONFIG.outputTemplate}"
`;

/**
 * Reads config.toml under the plugin config dir, writing the default first if absent.
 * @param {string | undefined} dir
 * @returns {Config}
 */
export function loadConfig(dir) {
  if (!dir) return DEFAULT_CONFIG;
  const path = join(dir, "config.toml");
  if (!existsSync(path)) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(path, TEMPLATE);
    return DEFAULT_CONFIG;
  }
  return parseConfig(readFileSync(path, "utf8"));
}

/**
 * Only `key = "string"` lines are needed; a full TOML parser would be a dependency.
 * @param {string} text
 * @returns {Config}
 */
export function parseConfig(text) {
  const values = new Map();
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"((?:[^"\\]|\\.)*)"\s*(#.*)?$/);
    if (m) values.set(m[1], JSON.parse(`"${m[2]}"`));
  }
  return {
    outputTemplate: values.get("output_template") ?? DEFAULT_CONFIG.outputTemplate,
  };
}

/**
 * @param {string} template
 * @param {Record<string, string>} vars
 */
export function renderTemplate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (whole, key) => vars[key] ?? whole);
}
