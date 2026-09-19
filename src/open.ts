// Action entry point: keybindings can only invoke actions, so this one opens
// the popup pane. The popup reads the calling pane from its own context.
const bin = process.env.HERDR_BIN_PATH ?? "herdr";
const plugin = process.env.HERDR_PLUGIN_ID ?? "herdr-target-picker";
const proc = Bun.spawnSync([bin, "plugin", "pane", "open", "--plugin", plugin, "--entrypoint", "pick"], {
  stdio: ["ignore", "inherit", "inherit"],
});
process.exit(proc.exitCode ?? 1);
