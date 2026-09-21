import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseConfig, renderTemplate } from "./config.mjs";
import { parseKeys } from "./keys.mjs";
import { column, hovered, initialState, reduce, toItems } from "./model.mjs";
import { width } from "./width.mjs";

function pane(id, extra = {}) {
  return { id, label: extra.label ?? null, agent: extra.agent ?? null, agentName: extra.agentName ?? null };
}

const spaces = [
  {
    id: "w1",
    label: "alpha",
    tabs: [
      { id: "w1:t1", label: "1", panes: [pane("w1:p1", { agent: "claude" }), pane("w1:p2")] },
      { id: "w1:t2", label: "review", panes: [pane("w1:p3", { agent: "codex", agentName: "reviewer" })] },
    ],
  },
  {
    id: "w2",
    label: "beta",
    tabs: [{ id: "w2:t1", label: "1", panes: [pane("w2:p1", { label: "server", agent: "claude" })] }],
  },
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `w${i + 3}`,
    label: `extra-${i}`,
    tabs: [{ id: `w${i + 3}:t1`, label: "1", panes: [pane(`w${i + 3}:p1`)] }],
  })),
];

const fresh = (path = []) => initialState(toItems(spaces), path);
const ids = (items) => items.map((it) => it.id);

describe("toItems", () => {
  test("pane label precedence: pane name > agent name (kind) > kind > shell", () => {
    const root = toItems(spaces);
    const panes = (w, t) => root[w].children[t].children;
    assert.deepEqual(panes(0, 0).map((p) => p.label), ["claude", "shell"]);
    assert.equal(panes(0, 1)[0].label, "reviewer (codex)");
    assert.equal(panes(0, 1)[0].name, "reviewer");
    assert.equal(panes(1, 0)[0].label, "server");
    assert.equal(panes(1, 0)[0].name, "server");
  });
});

describe("initialState", () => {
  test("hovers the calling path and lands on its page", () => {
    const s = fresh(["w12", "w12:t1", "w12:p1"]);
    assert.deepEqual(s.hover, [11, 0, 0]);
    assert.deepEqual(s.page, [1, 0, 0]);
    assert.equal(s.depth, 0);
  });

  test("unknown path falls back to the first item", () => {
    assert.deepEqual(fresh(["nope", null, null]).hover, [0, 0, 0]);
  });
});

describe("navigation", () => {
  test("columns follow the hover path", () => {
    const s = fresh();
    assert.deepEqual(ids(column(s, 1)), ["w1:t1", "w1:t2"]);
    assert.deepEqual(ids(column(s, 2)), ["w1:p1", "w1:p2"]);
    reduce(s, { type: "down" });
    assert.deepEqual(ids(column(s, 1)), ["w2:t1"]);
    assert.deepEqual(ids(column(s, 2)), ["w2:p1"]);
  });

  test("choose activates and moves right; back moves left", () => {
    const s = fresh();
    reduce(s, { type: "choose" });
    assert.equal(s.depth, 1);
    reduce(s, { type: "down" });
    assert.equal(hovered(s, 1)?.id, "w1:t2");
    assert.deepEqual(ids(column(s, 2)), ["w1:p3"]);
    reduce(s, { type: "back" });
    assert.equal(s.depth, 0);
    assert.equal(hovered(s, 1)?.id, "w1:t2");
  });

  test("changing a parent hover resets children", () => {
    const s = fresh();
    reduce(s, { type: "choose" });
    reduce(s, { type: "down" });
    reduce(s, { type: "back" });
    reduce(s, { type: "down" });
    assert.equal(s.hover[1], 0);
  });

  test("digit chooses the nth item on the current page", () => {
    const s = fresh();
    reduce(s, { type: "digit", n: 2 });
    assert.equal(s.depth, 1);
    assert.equal(hovered(s, 0)?.id, "w2");
    reduce(s, { type: "back" });
    reduce(s, { type: "pageDown" });
    assert.equal(s.page[0], 1);
    assert.equal(s.hover[0], 9);
    reduce(s, { type: "digit", n: 3 });
    assert.equal(hovered(s, 0)?.id, "w12");
  });

  test("digit past the end of the page is ignored", () => {
    const s = fresh();
    reduce(s, { type: "pageDown" });
    reduce(s, { type: "digit", n: 9 });
    assert.equal(s.depth, 0);
    assert.equal(s.hover[0], 9);
  });

  test("digit at the pane level only hovers", () => {
    const s = fresh();
    reduce(s, { type: "choose" });
    reduce(s, { type: "choose" });
    assert.equal(s.depth, 2);
    reduce(s, { type: "digit", n: 2 });
    assert.equal(s.depth, 2);
    assert.equal(hovered(s, 2)?.id, "w1:p2");
  });

  test("hover moves across pages and clamps at the ends", () => {
    const s = fresh();
    for (let i = 0; i < 20; i++) reduce(s, { type: "down" });
    assert.equal(s.hover[0], 11);
    assert.equal(s.page[0], 1);
    reduce(s, { type: "pageUp" });
    assert.equal(s.hover[0], 0);
    reduce(s, { type: "up" });
    assert.equal(s.hover[0], 0);
  });

  test("enter selects the hovered item at the current depth", () => {
    const s = fresh();
    assert.equal(reduce(s, { type: "enter" }).item.id, "w1");
    reduce(s, { type: "choose" });
    reduce(s, { type: "choose" });
    assert.equal(reduce(s, { type: "enter" }).item.id, "w1:p1");
  });

  test("escape outside search quits", () => {
    assert.deepEqual(reduce(fresh(), { type: "escape" }), { type: "quit" });
  });
});

describe("search", () => {
  test("typing filters the current column and hovers the first match", () => {
    const s = fresh();
    for (const char of "bet") reduce(s, { type: "input", char });
    assert.deepEqual(ids(column(s, 0)), ["w2"]);
    assert.equal(hovered(s, 0)?.id, "w2");
    assert.deepEqual(ids(column(s, 1)), ["w2:t1"]);
  });

  test("escape clears the query first, then quits", () => {
    const s = fresh();
    reduce(s, { type: "input", char: "b" });
    assert.equal(reduce(s, { type: "escape" }), null);
    assert.equal(s.filter[0], "");
    assert.equal(column(s, 0).length, 12);
    assert.deepEqual(reduce(s, { type: "escape" }), { type: "quit" });
  });

  test("ctrl-u clears and backspace edits", () => {
    const s = fresh();
    for (const char of "w2") reduce(s, { type: "input", char });
    assert.deepEqual(ids(column(s, 0)), ["w2"]);
    reduce(s, { type: "backspace" });
    assert.equal(column(s, 0).length, 12);
    reduce(s, { type: "input", char: "x" });
    reduce(s, { type: "clear" });
    assert.equal(s.filter[0], "");
  });

  test("digits are fast keys only while the query is empty", () => {
    const s = fresh();
    reduce(s, { type: "input", char: "w" });
    reduce(s, { type: "digit", n: 2 });
    assert.equal(s.filter[0], "w2");
    assert.equal(s.depth, 0);
    assert.deepEqual(ids(column(s, 0)), ["w2"]);
  });

  test("the query survives moving between columns", () => {
    const s = fresh();
    reduce(s, { type: "input", char: "a" });
    reduce(s, { type: "choose" });
    assert.equal(s.filter[1], "");
    reduce(s, { type: "back" });
    assert.equal(s.filter[0], "a");
  });
});

describe("parseKeys", () => {
  test("navigation keys", () => {
    assert.deepEqual(parseKeys("\x1b[B"), [{ type: "down" }]);
    assert.deepEqual(parseKeys("\x1b[6~"), [{ type: "pageDown" }]);
    assert.deepEqual(parseKeys("\r"), [{ type: "enter" }]);
    assert.deepEqual(parseKeys("\x1b"), [{ type: "escape" }]);
    assert.deepEqual(parseKeys("\x15"), [{ type: "clear" }]);
    assert.deepEqual(parseKeys("\x7f"), [{ type: "backspace" }]);
  });

  test("digits are reported apart from other text", () => {
    assert.deepEqual(parseKeys("3"), [{ type: "digit", n: 3 }]);
    assert.deepEqual(parseKeys("0"), [{ type: "input", char: "0" }]);
    assert.deepEqual(parseKeys("ab"), [
      { type: "input", char: "a" },
      { type: "input", char: "b" },
    ]);
  });

  test("unknown escape sequences are dropped", () => {
    assert.deepEqual(parseKeys("\x1b[Z"), []);
  });
});

describe("config", () => {
  test("parses output_template and ignores comments", () => {
    const cfg = parseConfig('# note\noutput_template = "@{name} {id}" # trailing\n');
    assert.equal(cfg.outputTemplate, "@{name} {id}");
  });

  test("falls back to the default when the key is absent", () => {
    assert.equal(parseConfig("").outputTemplate, "herdr:{name}({id})");
  });

  test("renderTemplate substitutes known tokens and keeps unknown ones", () => {
    assert.equal(
      renderTemplate("herdr:{name}({id}) {nope}", { name: "x", id: "w1", label: "x" }),
      "herdr:x(w1) {nope}",
    );
  });
});

describe("width", () => {
  test("counts CJK as two cells and combining marks as zero", () => {
    assert.equal(width("abc"), 3);
    assert.equal(width("閣樓冷氣"), 8);
    assert.equal(width("e\u0301"), 1);
    assert.equal(width("w6:pQ ▏"), 7);
  });
});
