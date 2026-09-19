import { loadConfig, renderTemplate } from "./config";
import { loadContext, loadTree, sendText } from "./herdr";
import { parseKeys } from "./keys";
import { initialState, reduce, toItems, type Item } from "./model";
import { render } from "./render";

const ALT_SCREEN_ON = "\x1b[?1049h\x1b[?25l";
const ALT_SCREEN_OFF = "\x1b[?25h\x1b[?1049l";

function fail(message: string): never {
  process.stderr.write(`herdr-target-picker: ${message}\n`);
  process.exit(1);
}

const config = loadConfig(process.env.HERDR_PLUGIN_CONFIG_DIR);
const context = loadContext();
if (!context.paneId) fail("no focused pane in HERDR_PLUGIN_CONTEXT_JSON; open the picker from a pane");
const targetPane = context.paneId;

const state = initialState(toItems(loadTree()), [context.workspaceId, context.tabId, context.paneId]);

const out = process.stdout;
const inp = process.stdin;

function draw(): void {
  out.write(render(state, out.columns ?? 80, out.rows ?? 24));
}

function leave(): void {
  inp.setRawMode(false);
  out.write(ALT_SCREEN_OFF);
}

function select(item: Item): void {
  const text = renderTemplate(config.outputTemplate, {
    name: item.name,
    label: item.label,
    id: item.id,
  });
  leave();
  try {
    sendText(targetPane, `${text} `);
  } catch (err) {
    fail((err as Error).message);
  }
  process.exit(0);
}

inp.setRawMode(true);
inp.resume();
inp.setEncoding("utf8");
out.write(ALT_SCREEN_ON);
out.on("resize", draw);
draw();

inp.on("data", (chunk: string) => {
  for (const action of parseKeys(chunk, state.search)) {
    const effect = reduce(state, action);
    if (effect?.type === "select") return select(effect.item);
    if (effect?.type === "quit") {
      leave();
      process.exit(0);
    }
  }
  draw();
});
