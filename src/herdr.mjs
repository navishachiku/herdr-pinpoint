// Thin wrapper around the herdr CLI. Everything the picker knows about the
// live session comes through here.

import { execFile, spawnSync } from "node:child_process";

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

// A remote machine silent this long is marked offline.
const REMOTE_TIMEOUT_MS = 4000;

const bin = process.env.HERDR_BIN_PATH ?? "herdr";

function parse(args, stdout) {
  const body = JSON.parse(stdout);
  if (body.error) throw new Error(`herdr ${args.join(" ")}: ${JSON.stringify(body.error)}`);
  return body.result;
}

function call(args) {
  const proc = spawnSync(bin, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (proc.error) throw new Error(`herdr ${args.join(" ")} failed: ${proc.error.message}`);
  if (proc.status !== 0) throw new Error(`herdr ${args.join(" ")} failed: ${proc.stderr.trim()}`);
  return parse(args, proc.stdout);
}

/** Asynchronous, so machines are asked side by side and none holds the picker. */
function callAsync(args, machine, signal) {
  if (machine) args = ["--machine", machine, ...args];
  return new Promise((resolve, reject) => {
    execFile(bin, args, { encoding: "utf8", timeout: machine ? REMOTE_TIMEOUT_MS : 0, signal }, (err, stdout, stderr) => {
      if (err) return reject(new Error(`herdr ${args.join(" ")} failed: ${stderr.trim() || err.message}`));
      try {
        resolve(parse(args, stdout));
      } catch (e) {
        reject(e);
      }
    });
  });
}

/** @returns {string[]} labels of enabled saved machines; none if the list is unavailable */
export function remoteMachines() {
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

/**
 * Spaces of one machine; rejects when a remote machine cannot be reached.
 * @param {string | null} machine  saved machine label; null for this one
 * @param {AbortSignal} [signal]
 * @returns {Promise<Space[]>}
 */
export async function loadMachineTree(machine, signal) {
  const ask = (args) => callAsync(args, machine, signal);
  const [{ workspaces }, { agents }] = await Promise.all([ask(["workspace", "list"]), ask(["agent", "list"])]);
  const agentNames = new Map(agents.map((a) => [a.pane_id, a.name ?? null]));

  return Promise.all(
    workspaces.map(async (ws) => {
      const [{ tabs }, { panes }] = await Promise.all([
        ask(["tab", "list", "--workspace", ws.workspace_id]),
        ask(["pane", "list", "--workspace", ws.workspace_id]),
      ]);
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
    }),
  );
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
