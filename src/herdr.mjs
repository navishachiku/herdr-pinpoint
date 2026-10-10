// Thin wrapper around the herdr CLI. Everything the picker knows about the
// live session comes through here.

import { spawnSync } from "node:child_process";

/**
 * @typedef {{ id: string, machine: string | null, label: string, tabs: Tab[] }} Space
 *   machine: label of the saved machine the space lives on; null for this one.
 * @typedef {{ id: string, label: string, panes: Pane[] }} Tab
 * @typedef {{ id: string, label: string | null, agent: string | null, agentName: string | null }} Pane
 *   label: manual pane name set with `herdr pane rename`;
 *   agent: agent kind detected in the pane, e.g. `claude`;
 *   agentName: unique live agent name set with `herdr agent rename` or `agent start`.
 * @typedef {{ workspaceId: string | null, tabId: string | null, paneId: string | null }} Context
 */

// A dead machine must not hold the picker open.
const REMOTE_TIMEOUT_MS = 4000;

const bin = process.env.HERDR_BIN_PATH ?? "herdr";

function call(args, machine = null) {
  if (machine) args = ["--machine", machine, ...args];
  const proc = spawnSync(bin, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: machine ? REMOTE_TIMEOUT_MS : undefined,
  });
  if (proc.error) throw new Error(`herdr ${args.join(" ")} failed: ${proc.error.message}`);
  if (proc.status !== 0) throw new Error(`herdr ${args.join(" ")} failed: ${proc.stderr.trim()}`);
  const body = JSON.parse(proc.stdout);
  if (body.error) throw new Error(`herdr ${args.join(" ")}: ${JSON.stringify(body.error)}`);
  return body.result;
}

/**
 * Local spaces first, then those of every enabled saved machine. A machine that
 * cannot be reached is skipped so it never blocks the picker.
 * @returns {Space[]}
 */
export function loadTree() {
  const spaces = loadMachineTree(null);
  for (const label of remoteMachines()) {
    try {
      spaces.push(...loadMachineTree(label));
    } catch {
      // unreachable machine: leave it out
    }
  }
  return spaces;
}

/** @returns {string[]} labels of enabled saved machines; none if the list is unavailable */
function remoteMachines() {
  try {
    const proc = spawnSync(bin, ["machine", "list", "--json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    if (proc.status !== 0) return [];
    return JSON.parse(proc.stdout)
      .filter((m) => m.enabled)
      .map((m) => m.label);
  } catch {
    return [];
  }
}

/** @param {string | null} machine @returns {Space[]} */
function loadMachineTree(machine) {
  const { workspaces } = call(["workspace", "list"], machine);
  const { agents } = call(["agent", "list"], machine);
  const agentNames = new Map(agents.map((a) => [a.pane_id, a.name ?? null]));

  return workspaces.map((ws) => {
    const { tabs } = call(["tab", "list", "--workspace", ws.workspace_id], machine);
    const { panes } = call(["pane", "list", "--workspace", ws.workspace_id], machine);
    return {
      id: ws.workspace_id,
      machine,
      label: ws.label,
      tabs: tabs.map((tab) => ({
        id: tab.tab_id,
        label: tab.label,
        panes: panes
          .filter((p) => p.tab_id === tab.tab_id)
          .map((p) => ({
            id: p.pane_id,
            label: p.label ?? null,
            agent: p.agent ?? null,
            agentName: agentNames.get(p.pane_id) ?? null,
          })),
      })),
    };
  });
}

/** @returns {Context} */
export function loadContext() {
  const raw = process.env.HERDR_PLUGIN_CONTEXT_JSON;
  if (!raw) return { workspaceId: null, tabId: null, paneId: null };
  const ctx = JSON.parse(raw);
  return {
    workspaceId: ctx.workspace_id ?? null,
    tabId: ctx.tab_id ?? null,
    paneId: ctx.focused_pane_id ?? null,
  };
}

export function sendText(paneId, text) {
  call(["pane", "send-text", paneId, text]);
}
