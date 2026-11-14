import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

// A stand-in herdr: this machine answers at once, `--machine Dead` never does.
// `--machine Busy` has 12 spaces and, like sshd's session limit, refuses a
// command while 5 others are in flight; its first `tab list` for w3 also fails.
const dir = mkdtempSync(join(tmpdir(), "pinpoint-"));
const bin = join(dir, "herdr");
mkdirSync(join(dir, "inflight"));
writeFileSync(
  bin,
  `#!/usr/bin/env node
const { mkdirSync, readdirSync, rmSync, writeFileSync } = require("node:fs");
const dir = ${JSON.stringify(dir)};
let args = process.argv.slice(2);
let machine = null;
if (args[0] === "--machine") [, machine, ...args] = args;
if (machine === "Dead") setInterval(() => {}, 1000);
else (async () => {
  const cmd = args.slice(0, 2).join(" ");
  const spaces = machine === "Busy" ? Array.from({ length: 12 }, (_, i) => "w" + (i + 1)) : ["w1"];
  const result = {
    "workspace list": { workspaces: spaces.map((id) => ({ workspace_id: id, label: id === "w1" && !machine ? "local" : id })) },
    "agent list": { agents: [] },
    "tab list": { tabs: [{ tab_id: "t", label: "t" }] },
    "pane list": { panes: [{ pane_id: "p", tab_id: "t" }] },
  }[cmd];
  const fail = (msg) => { process.stderr.write(msg); process.exit(1); };
  if (machine === "Busy") {
    const mine = dir + "/inflight/" + process.pid;
    writeFileSync(mine, "");
    const crowded = readdirSync(dir + "/inflight").length > 5;
    await new Promise((r) => setTimeout(r, 40));
    rmSync(mine);
    if (crowded) fail("Session open refused by peer");
    if (args.join(" ") === "tab list --workspace w3") {
      try { mkdirSync(dir + "/flaked"); fail("connection reset"); } catch (e) { if (e.code !== "EEXIST") throw e; }
    }
  }
  process.stdout.write(JSON.stringify({ result }));
})();
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

test("a machine with many spaces is listed in full and one failed command does not take it offline", async () => {
  const spaces = await loadMachineTree("Busy");
  assert.deepEqual(spaces.map((s) => s.id), Array.from({ length: 12 }, (_, i) => "w" + (i + 1)));
});
