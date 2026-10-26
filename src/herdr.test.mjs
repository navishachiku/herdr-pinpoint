import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

// A stand-in herdr: this machine answers at once, `--machine Dead` never does.
const dir = mkdtempSync(join(tmpdir(), "pinpoint-"));
const bin = join(dir, "herdr");
writeFileSync(
  bin,
  `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === "--machine") setInterval(() => {}, 1000);
else {
  const cmd = args.slice(0, 2).join(" ");
  const result = {
    "workspace list": { workspaces: [{ workspace_id: "w1", label: "local" }] },
    "agent list": { agents: [] },
    "tab list": { tabs: [{ tab_id: "w1:t1", label: "t" }] },
    "pane list": { panes: [{ pane_id: "w1:p1", tab_id: "w1:t1" }] },
  }[cmd];
  process.stdout.write(JSON.stringify({ result }));
}
`,
);
chmodSync(bin, 0o755);
process.env.HERDR_BIN_PATH = bin;
const { loadMachineTree } = await import("./herdr.mjs");

test("this machine's spaces arrive while a dead machine is still being asked", async () => {
  const abort = new AbortController();
  let deadSettled = false;
  const dead = loadMachineTree("Dead", abort.signal).then(
    () => (deadSettled = true),
    () => (deadSettled = true),
  );
  const started = Date.now();
  const spaces = await loadMachineTree(null);
  assert.ok(Date.now() - started < 1000);
  assert.deepEqual(spaces.map((s) => s.label), ["local"]);
  assert.equal(deadSettled, false);
  abort.abort();
  await dead;
});
