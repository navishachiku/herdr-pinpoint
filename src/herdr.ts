// Thin wrapper around the herdr CLI. Everything the picker knows about the
// live session comes through here.

export interface Space {
  id: string;
  label: string;
  tabs: Tab[];
}

export interface Tab {
  id: string;
  label: string;
  panes: Pane[];
}

export interface Pane {
  id: string;
  /** Manual pane name set with `herdr pane rename`. */
  label: string | null;
  /** Agent kind detected in the pane, e.g. `claude`. */
  agent: string | null;
  /** Unique live agent name set with `herdr agent rename` or `agent start`. */
  agentName: string | null;
}

export interface Context {
  workspaceId: string | null;
  tabId: string | null;
  paneId: string | null;
}

const bin = process.env.HERDR_BIN_PATH ?? "herdr";

function call<T>(args: string[]): T {
  const proc = Bun.spawnSync([bin, ...args], { stdio: ["ignore", "pipe", "pipe"] });
  if (proc.exitCode !== 0) {
    throw new Error(`herdr ${args.join(" ")} failed: ${proc.stderr.toString().trim()}`);
  }
  const body = JSON.parse(proc.stdout.toString());
  if (body.error) throw new Error(`herdr ${args.join(" ")}: ${JSON.stringify(body.error)}`);
  return body.result as T;
}

interface WorkspaceRow { workspace_id: string; label: string }
interface TabRow { tab_id: string; label: string }
interface PaneRow { pane_id: string; tab_id: string; label: string | null; agent: string | null }
interface AgentRow { pane_id: string; name?: string | null }

export function loadTree(): Space[] {
  const { workspaces } = call<{ workspaces: WorkspaceRow[] }>(["workspace", "list"]);
  const { agents } = call<{ agents: AgentRow[] }>(["agent", "list"]);
  const agentNames = new Map(agents.map((a) => [a.pane_id, a.name ?? null]));

  return workspaces.map((ws) => {
    const { tabs } = call<{ tabs: TabRow[] }>(["tab", "list", "--workspace", ws.workspace_id]);
    const { panes } = call<{ panes: PaneRow[] }>(["pane", "list", "--workspace", ws.workspace_id]);
    return {
      id: ws.workspace_id,
      label: ws.label,
      tabs: tabs.map((tab) => ({
        id: tab.tab_id,
        label: tab.label,
        panes: panes
          .filter((p) => p.tab_id === tab.tab_id)
          .map((p) => ({
            id: p.pane_id,
            label: p.label,
            agent: p.agent,
            agentName: agentNames.get(p.pane_id) ?? null,
          })),
      })),
    };
  });
}

export function loadContext(): Context {
  const raw = process.env.HERDR_PLUGIN_CONTEXT_JSON;
  if (!raw) return { workspaceId: null, tabId: null, paneId: null };
  const ctx = JSON.parse(raw);
  return {
    workspaceId: ctx.workspace_id ?? null,
    tabId: ctx.tab_id ?? null,
    paneId: ctx.focused_pane_id ?? null,
  };
}

export function sendText(paneId: string, text: string): void {
  call(["pane", "send-text", paneId, text]);
}
