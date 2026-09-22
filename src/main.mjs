import { loadConfig, renderTemplate } from "./config.mjs";
import { loadContext, loadTree, sendText } from "./herdr.mjs";
import { parseKeys } from "./keys.mjs";
import { current, initialState, reduce, toItems } from "./model.mjs";
import { render } from "./render.mjs";

const ALT_SCREEN_ON = "\x1b[?1049h\x1b[?25l";
const ALT_SCREEN_OFF = "\x1b[?25h\x1b[?1049l";

function fail(message) {
  process.stderr.write(`herdr-pinpoint: ${message}\n`);
  process.exit(1);
}

const config = loadConfig(process.env.HERDR_PLUGIN_CONFIG_DIR);
const context = loadContext();
if (!context.paneId) fail("no focused pane in HERDR_PLUGIN_CONTEXT_JSON; open the picker from a pane");
const targetPane = context.paneId;

const state = initialState(toItems(loadTree()), [context.workspaceId, context.tabId, context.paneId]);

const out = process.stdout;
const inp = process.stdin;

function outputFor(item) {
  return renderTemplate(config.outputTemplate, { name: item.name, label: item.label, id: item.id });
}

function draw() {
  // No preview while the query is being typed: nothing is selected yet.
  const item = state.typing ? undefined : current(state);
  out.write(render(state, out.columns ?? 80, out.rows ?? 24, item ? outputFor(item) : ""));
}

function leave() {
  inp.setRawMode(false);
  out.write(ALT_SCREEN_OFF);
}

function select(item) {
  const text = outputFor(item);
  leave();
  try {
    sendText(targetPane, `${text} `);
  } catch (err) {
    fail(err.message);
  }
  process.exit(0);
}

inp.setRawMode(true);
inp.resume();
inp.setEncoding("utf8");
out.write(ALT_SCREEN_ON);
out.on("resize", draw);
draw();

inp.on("data", (chunk) => {
  for (const action of parseKeys(chunk)) {
    const effect = reduce(state, action);
    if (effect?.type === "select") return select(effect.item);
    if (effect?.type === "quit") {
      leave();
      process.exit(0);
    }
  }
  draw();
});
