import { describe, expect, test } from "bun:test";
import { parseConfig, renderTemplate } from "./config";
import { parseKeys } from "./keys";
import { column, hovered, initialState, reduce, toItems, type Item, type State } from "./model";

function pane(id: string, extra: Partial<{ label: string; agent: string; agentName: string }> = {}) {
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

const fresh = (path: (string | null)[] = []): State => initialState(toItems(spaces), path);
const ids = (items: Item[]) => items.map((it) => it.id);

describe("toItems", () => {
  test("pane label precedence: pane name > agent name (kind) > kind > shell", () => {
    const root = toItems(spaces);
    const panes = (w: number, t: number) => root[w].children[t].children;
    expect(panes(0, 0).map((p) => p.label)).toEqual(["claude", "shell"]);
    expect(panes(0, 1)[0]).toMatchObject({ label: "reviewer (codex)", name: "reviewer" });
    expect(panes(1, 0)[0]).toMatchObject({ label: "server", name: "server" });
  });
});

describe("initialState", () => {
  test("hovers the calling path and lands on its page", () => {
    const s = fresh(["w12", "w12:t1", "w12:p1"]);
    expect(s.hover).toEqual([11, 0, 0]);
    expect(s.page).toEqual([1, 0, 0]);
    expect(s.depth).toBe(0);
  });

  test("unknown path falls back to the first item", () => {
    expect(fresh(["nope", null, null]).hover).toEqual([0, 0, 0]);
  });
});

describe("navigation", () => {
  test("columns follow the hover path", () => {
    const s = fresh();
    expect(ids(column(s, 1))).toEqual(["w1:t1", "w1:t2"]);
    expect(ids(column(s, 2))).toEqual(["w1:p1", "w1:p2"]);
    reduce(s, { type: "down" });
    expect(ids(column(s, 1))).toEqual(["w2:t1"]);
    expect(ids(column(s, 2))).toEqual(["w2:p1"]);
  });

  test("choose activates and moves right; back moves left", () => {
    const s = fresh();
    reduce(s, { type: "choose" });
    expect(s.depth).toBe(1);
    reduce(s, { type: "down" });
    expect(hovered(s, 1)?.id).toBe("w1:t2");
    expect(ids(column(s, 2))).toEqual(["w1:p3"]);
    reduce(s, { type: "back" });
    expect(s.depth).toBe(0);
    expect(hovered(s, 1)?.id).toBe("w1:t2");
  });

  test("changing a parent hover resets children", () => {
    const s = fresh();
    reduce(s, { type: "choose" });
    reduce(s, { type: "down" });
    reduce(s, { type: "back" });
    reduce(s, { type: "down" });
    expect(s.hover[1]).toBe(0);
  });

  test("digit chooses the nth item on the current page", () => {
    const s = fresh();
    reduce(s, { type: "digit", n: 2 });
    expect(s.depth).toBe(1);
    expect(hovered(s, 0)?.id).toBe("w2");
    reduce(s, { type: "back" });
    reduce(s, { type: "pageDown" });
    expect(s.page[0]).toBe(1);
    expect(s.hover[0]).toBe(9);
    reduce(s, { type: "digit", n: 3 });
    expect(hovered(s, 0)?.id).toBe("w12");
  });

  test("digit past the end of the page is ignored", () => {
    const s = fresh();
    reduce(s, { type: "pageDown" });
    reduce(s, { type: "digit", n: 9 });
    expect(s.depth).toBe(0);
    expect(s.hover[0]).toBe(9);
  });

  test("digit at the pane level only hovers", () => {
    const s = fresh();
    reduce(s, { type: "choose" });
    reduce(s, { type: "choose" });
    expect(s.depth).toBe(2);
    reduce(s, { type: "digit", n: 2 });
    expect(s.depth).toBe(2);
    expect(hovered(s, 2)?.id).toBe("w1:p2");
  });

  test("hover moves across pages and clamps at the ends", () => {
    const s = fresh();
    for (let i = 0; i < 20; i++) reduce(s, { type: "down" });
    expect(s.hover[0]).toBe(11);
    expect(s.page[0]).toBe(1);
    reduce(s, { type: "pageUp" });
    expect(s.hover[0]).toBe(0);
    reduce(s, { type: "up" });
    expect(s.hover[0]).toBe(0);
  });

  test("enter selects the hovered item at the current depth", () => {
    const s = fresh();
    expect(reduce(s, { type: "enter" })).toEqual({ type: "select", item: expect.objectContaining({ id: "w1" }) });
    reduce(s, { type: "choose" });
    reduce(s, { type: "choose" });
    expect(reduce(s, { type: "enter" })).toEqual({ type: "select", item: expect.objectContaining({ id: "w1:p1" }) });
  });

  test("escape outside search quits", () => {
    expect(reduce(fresh(), { type: "escape" })).toEqual({ type: "quit" });
  });
});

describe("search", () => {
  test("typing filters the current column and hovers the first match", () => {
    const s = fresh();
    for (const char of "bet") reduce(s, { type: "input", char });
    expect(ids(column(s, 0))).toEqual(["w2"]);
    expect(hovered(s, 0)?.id).toBe("w2");
    expect(ids(column(s, 1))).toEqual(["w2:t1"]);
  });

  test("escape clears the query first, then quits", () => {
    const s = fresh();
    reduce(s, { type: "input", char: "b" });
    expect(reduce(s, { type: "escape" })).toBeNull();
    expect(s.filter[0]).toBe("");
    expect(column(s, 0)).toHaveLength(12);
    expect(reduce(s, { type: "escape" })).toEqual({ type: "quit" });
  });

  test("ctrl-u clears and backspace edits", () => {
    const s = fresh();
    for (const char of "w2") reduce(s, { type: "input", char });
    expect(ids(column(s, 0))).toEqual(["w2"]);
    reduce(s, { type: "backspace" });
    expect(column(s, 0)).toHaveLength(12);
    reduce(s, { type: "input", char: "x" });
    reduce(s, { type: "clear" });
    expect(s.filter[0]).toBe("");
  });

  test("digits are fast keys only while the query is empty", () => {
    const s = fresh();
    reduce(s, { type: "input", char: "w" });
    reduce(s, { type: "digit", n: 2 });
    expect(s.filter[0]).toBe("w2");
    expect(s.depth).toBe(0);
    expect(ids(column(s, 0))).toEqual(["w2"]);
  });

  test("the query survives moving between columns", () => {
    const s = fresh();
    reduce(s, { type: "input", char: "a" });
    reduce(s, { type: "choose" });
    expect(s.filter[1]).toBe("");
    reduce(s, { type: "back" });
    expect(s.filter[0]).toBe("a");
  });
});

describe("parseKeys", () => {
  test("navigation keys", () => {
    expect(parseKeys("\x1b[B")).toEqual([{ type: "down" }]);
    expect(parseKeys("\x1b[6~")).toEqual([{ type: "pageDown" }]);
    expect(parseKeys("\r")).toEqual([{ type: "enter" }]);
    expect(parseKeys("\x1b")).toEqual([{ type: "escape" }]);
    expect(parseKeys("\x15")).toEqual([{ type: "clear" }]);
    expect(parseKeys("\x7f")).toEqual([{ type: "backspace" }]);
  });

  test("digits are reported apart from other text", () => {
    expect(parseKeys("3")).toEqual([{ type: "digit", n: 3 }]);
    expect(parseKeys("0")).toEqual([{ type: "input", char: "0" }]);
    expect(parseKeys("ab")).toEqual([
      { type: "input", char: "a" },
      { type: "input", char: "b" },
    ]);
  });

  test("unknown escape sequences are dropped", () => {
    expect(parseKeys("\x1b[Z")).toEqual([]);
  });
});

describe("config", () => {
  test("parses output_template and ignores comments", () => {
    const cfg = parseConfig('# note\noutput_template = "@{name} {id}" # trailing\n');
    expect(cfg.outputTemplate).toBe("@{name} {id}");
  });

  test("falls back to the default when the key is absent", () => {
    expect(parseConfig("").outputTemplate).toBe("herdr:{name}({id})");
  });

  test("renderTemplate substitutes known tokens and keeps unknown ones", () => {
    expect(renderTemplate("herdr:{name}({id}) {nope}", { name: "x", id: "w1", label: "x" })).toBe(
      "herdr:x(w1) {nope}",
    );
  });
});
