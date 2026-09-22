// Written from the picker specification, not from the implementation: every
// expectation below restates a line of the spec.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseConfig, renderTemplate } from "./config.mjs";
import { parseKeys } from "./keys.mjs";
import {
  PAGE_SIZE,
  column,
  fastKeysActive,
  findMatches,
  hovered,
  initialState,
  matchPageCount,
  matchPageItems,
  pageCount,
  pageItems,
  pathText,
  reduce,
  searching,
  toItems,
} from "./model.mjs";
import { width } from "./width.mjs";

// ---------------------------------------------------------------- fixture

const pane = (id, extra = {}) => ({
  id,
  label: extra.label ?? null,
  agent: extra.agent ?? null,
  agentName: extra.agentName ?? null,
});

// 13 spaces (two pages); `w13` holds 12 tabs and one tab of 12 panes, so every
// level can be paged and the popup can open deep inside the tree.
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
    tabs: [{ id: "w2:t1", label: "1", panes: [pane("w2:p1", { label: "Server", agent: "claude" })] }],
  },
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `w${i + 3}`,
    label: `extra-${i}`,
    tabs: [{ id: `w${i + 3}:t1`, label: "1", panes: [pane(`w${i + 3}:p1`)] }],
  })),
  {
    id: "w13",
    label: "deep",
    tabs: Array.from({ length: 12 }, (_, t) => ({
      id: `w13:t${t}`,
      label: `tab-${t}`,
      panes: Array.from({ length: t === 10 ? 12 : 1 }, (_, p) =>
        pane(`w13:t${t}:p${p}`, { label: `pane-${t}-${p}` }),
      ),
    })),
  },
];

const UP = { type: "up" };
const DOWN = { type: "down" };
const RIGHT = { type: "choose" };
const LEFT = { type: "back" };
const PGUP = { type: "pageUp" };
const PGDN = { type: "pageDown" };
const ENTER = { type: "enter" };
const ESC = { type: "escape" };
const SLASH = { type: "query" };
const BACKSPACE = { type: "backspace" };
const CTRL_U = { type: "clear" };
const digit = (n) => ({ type: "digit", n });
const char = (c) => ({ type: "input", char: c });

const root = toItems(spaces);
const fresh = (path = []) => initialState(toItems(spaces), path);
const ids = (items) => items.map((it) => it.id);
const matchIds = (state) => state.matches.map((m) => m.item.id);

/** Feeds text the way the key layer does: 1-9 are digits, `/` is the query key. */
function typeText(state, text) {
  for (const c of text) {
    if (c >= "1" && c <= "9") reduce(state, digit(Number(c)));
    else if (c === "/") reduce(state, SLASH);
    else reduce(state, char(c));
  }
}

/** Browse -> query open with `text` typed in. */
const openQuery = (state, text) => {
  reduce(state, SLASH);
  typeText(state, text);
};

/** Browse -> results: query typed, then closed for editing with Enter. */
function results(query) {
  const state = fresh();
  openQuery(state, query);
  reduce(state, ENTER);
  return state;
}

/** Everything a key could damage, as one comparable value. */
const snapshot = (s) =>
  JSON.stringify({
    depth: s.depth,
    hover: s.hover,
    page: s.page,
    query: s.query,
    typing: s.typing,
    cursor: s.cursor,
    matchPage: s.matchPage,
    matches: matchIds(s),
  });

function unchangedBy(state, actions, why) {
  const before = snapshot(state);
  for (const action of actions) assert.equal(reduce(state, action), null, why);
  assert.equal(snapshot(state), before, why);
}

// ------------------------------------------------------- items and opening

describe("items and opening", () => {
  test("pane labels: pane name, else agent name (kind), else kind, else shell", () => {
    const panes = (w, t) => root[w].children[t].children;
    assert.deepEqual(panes(0, 0).map((p) => p.label), ["claude", "shell"]);
    assert.deepEqual([panes(0, 1)[0].label, panes(0, 1)[0].name], ["reviewer (codex)", "reviewer"]);
    assert.deepEqual([panes(1, 0)[0].label, panes(1, 0)[0].name], ["Server", "Server"]);
  });

  test("opens on the invoking space, tab and pane, each on the page holding it", () => {
    const s = fresh(["w13", "w13:t10", "w13:t10:p10"]);
    assert.deepEqual(s.hover, [12, 10, 10]);
    assert.deepEqual(s.page, [1, 1, 1]);
    assert.equal(hovered(s, 2).id, "w13:t10:p10");
    assert.ok(ids(pageItems(s, 1)).includes("w13:t10"));
    assert.ok(ids(pageItems(s, 2)).includes("w13:t10:p10"));
    assert.deepEqual([s.depth, s.query, s.typing, searching(s)], [0, "", false, false]);
  });

  test("an unknown path falls back to the first item", () => {
    assert.deepEqual(fresh(["nope", null, null]).hover, [0, 0, 0]);
  });
});

// ------------------------------------------------------------ browse mode

describe("browse", () => {
  test("up and down move the hover, and the columns to the right follow it", () => {
    const s = fresh();
    assert.deepEqual(ids(column(s, 1)), ["w1:t1", "w1:t2"]);
    assert.deepEqual(ids(column(s, 2)), ["w1:p1", "w1:p2"]);
    reduce(s, DOWN);
    assert.equal(hovered(s, 0).id, "w2");
    assert.deepEqual(ids(column(s, 1)), ["w2:t1"]);
    assert.deepEqual(ids(column(s, 2)), ["w2:p1"]);
    reduce(s, UP);
    reduce(s, UP);
    assert.equal(s.hover[0], 0, "the hover stops at the top");
    for (let i = 0; i < 20; i++) reduce(s, DOWN);
    assert.equal(s.hover[0], 12, "and at the bottom");
  });

  test("right activates and moves right; left comes back with that item hovered", () => {
    const s = fresh();
    unchangedBy(s, [LEFT], "there is no column left of the spaces");
    reduce(s, DOWN);
    reduce(s, RIGHT);
    assert.deepEqual([s.depth, hovered(s, 0).id], [1, "w2"]);
    reduce(s, RIGHT);
    assert.equal(s.depth, 2);
    unchangedBy(s, [RIGHT], "there is no column right of the panes");
    reduce(s, LEFT);
    assert.deepEqual([s.depth, hovered(s, 1).id], [1, "w2:t1"], "the activated tab stays hovered");
  });

  test("moving the hover resets the columns to its right; a key that moves nothing does not", () => {
    const s = fresh(["w13", "w13:t10", "w13:t10:p10"]);
    unchangedBy(s, [DOWN], "w13 is the last space, so the hover does not move");
    reduce(s, UP);
    assert.deepEqual(s.hover, [11, 0, 0], "the tab and pane columns restart");
    assert.deepEqual(s.page, [1, 0, 0]);
  });

  test("nine to a page, and paging lands on the first item of the new page", () => {
    assert.equal(PAGE_SIZE, 9);
    const s = fresh();
    assert.deepEqual([column(s, 0).length, pageCount(s, 0), pageItems(s, 0).length], [13, 2, 9]);
    reduce(s, PGDN);
    assert.deepEqual([s.page[0], s.hover[0], hovered(s, 0).id], [1, 9, "w10"]);
    assert.equal(pageItems(s, 0).length, 4);
    reduce(s, PGUP);
    assert.deepEqual([s.page[0], s.hover[0]], [0, 0]);

    const deep = fresh(["w13", null, null]);
    reduce(deep, RIGHT);
    assert.equal(pageCount(deep, 1), 2);
    reduce(deep, PGDN);
    assert.deepEqual([deep.page[1], deep.hover[1], hovered(deep, 1).id], [1, 9, "w13:t9"]);
  });

  test("paging with nowhere to go changes nothing at all", () => {
    const s = fresh();
    reduce(s, DOWN);
    reduce(s, DOWN);
    unchangedBy(s, [PGUP], "page 1 has no page before it");
    reduce(s, PGDN);
    reduce(s, DOWN);
    assert.deepEqual([s.page[0], s.hover[0]], [1, 10]);
    unchangedBy(s, [PGDN], "this is the last page");
    reduce(s, RIGHT);
    assert.equal(pageCount(s, 1), 1);
    unchangedBy(s, [PGDN, PGUP], "a single-page column has nowhere to go");
  });

  test("a digit does what right would do for the item at that position on the page", () => {
    const s = fresh();
    assert.equal(reduce(s, digit(2)), null);
    assert.deepEqual([hovered(s, 0).id, s.depth], ["w2", 1]);
    reduce(s, LEFT);
    reduce(s, PGDN);
    reduce(s, digit(3));
    assert.deepEqual([hovered(s, 0).id, s.depth], ["w12", 1], "counted from the top of page 2");
    reduce(s, LEFT);
    unchangedBy(s, [digit(5), digit(9)], "page 2 holds only four spaces");
  });

  test("in the rightmost column a digit only hovers", () => {
    const s = fresh();
    reduce(s, RIGHT);
    reduce(s, RIGHT);
    assert.equal(reduce(s, digit(2)), null, "it must not confirm");
    assert.deepEqual([s.depth, hovered(s, 2).id], [2, "w1:p2"]);
  });

  test("enter confirms at any level and escape closes the popup", () => {
    const s = fresh();
    assert.deepEqual(reduce(s, ENTER), { type: "select", item: hovered(s, 0) });
    assert.equal(hovered(s, 0).id, "w1", "a space can be confirmed");
    reduce(s, RIGHT);
    reduce(s, DOWN);
    assert.equal(reduce(s, ENTER).item.id, "w1:t2", "so can a tab");
    reduce(s, RIGHT);
    const effect = reduce(s, ENTER);
    assert.deepEqual([effect.type, effect.item.id, effect.item.name], ["select", "w1:p3", "reviewer"]);
    assert.deepEqual(reduce(s, ESC), { type: "quit" });
  });

  test("keys with no meaning in browse do nothing", () => {
    const s = fresh(["w13", "w13:t10", "w13:t10:p10"]);
    reduce(s, RIGHT);
    unchangedBy(s, [char("b"), char(" "), BACKSPACE, CTRL_U], "not keys of this mode");
  });
});

// ---------------------------------------------------------------- matching

describe("matching", () => {
  test("the query is matched against the joined path text, case-insensitively", () => {
    const [m, ...rest] = findMatches(root, "serv");
    assert.deepEqual([m.item.id, rest.length], ["w2:p1", 0]);
    assert.equal(pathText(m), "beta / 1 / Server");
    assert.deepEqual([m.from, m.to], [11, 15], "the run to highlight inside the path text");
    assert.deepEqual(findMatches(root, "SERVER").map((x) => x.item.id), ["w2:p1"]);
  });

  test("matching is plain substring, not fuzzy", () => {
    assert.deepEqual(findMatches(root, "apl"), [], "'apl' must not fuzzy-match 'alpha'");
    assert.deepEqual(findMatches(root, "srvr"), []);
    assert.deepEqual(findMatches(root, ""), []);
  });

  test("results are ordered deepest level first", () => {
    assert.deepEqual(findMatches(root, "beta").map((x) => x.item.id), ["w2:p1", "w2:t1", "w2"]);
    assert.deepEqual(
      findMatches(root, "ALPHA").map((x) => x.item.id),
      ["w1:p1", "w1:p2", "w1:p3", "w1:t1", "w1:t2", "w1"],
    );
  });
});

// ------------------------------------------------------------- query open

describe("query", () => {
  test("slash opens an empty query; typing replaces the columns with one flat list", () => {
    const s = fresh();
    reduce(s, SLASH);
    assert.deepEqual([s.query, s.typing, searching(s)], ["", true, false], "empty: columns stay up");
    const sizes = [];
    for (const c of "extra-9") {
      typeText(s, c);
      sizes.push(s.matches.length);
    }
    assert.equal(s.query, "extra-9", "digits are typed into the query");
    assert.equal(searching(s), true);
    assert.ok(sizes[0] > sizes[1] && sizes[1] > sizes.at(-1), `rebuilt per keystroke: ${sizes}`);
    assert.deepEqual(matchIds(s), ["w12:p1", "w12:t1", "w12"]);
    assert.equal(matchPageItems(s).length, 3);
  });

  test("a slash typed into an open query is an ordinary character", () => {
    const s = fresh();
    openQuery(s, "alpha / rev");
    assert.equal(s.query, "alpha / rev");
    assert.deepEqual(matchIds(s), ["w1:p3", "w1:t2"]);
  });

  test("a query that matches nothing shows an empty list and recovers", () => {
    const s = fresh();
    openQuery(s, "extra-9");
    typeText(s, "zzz");
    assert.equal(s.query, "extra-9zzz", "the typing is kept");
    assert.deepEqual(matchIds(s), [], "and the list is empty rather than stale");
    assert.equal(s.matches[s.cursor], undefined, "so there is nothing to confirm");
    for (let i = 0; i < 3; i++) reduce(s, BACKSPACE);
    assert.deepEqual([s.query, matchIds(s).length], ["extra-9", 3], "deleting brings the matches back");
  });

  test("the first arrow moves the focus from the box onto a row", () => {
    const s = fresh();
    openQuery(s, "extra-9");
    reduce(s, DOWN);
    assert.deepEqual([s.typing, s.cursor], [false, 0], "down lands on the first result, not the second");
    const t = fresh();
    openQuery(t, "extra-9");
    reduce(t, UP);
    assert.deepEqual([t.typing, t.cursor], [false, t.matches.length - 1], "up lands on the last");
    reduce(s, UP);
    assert.deepEqual([s.typing, s.query], [true, "extra-9"], "and up from the first row returns to the box");
  });

  test("up and down move the selection; keys with no meaning are discarded", () => {
    const s = fresh();
    openQuery(s, "extra-9");
    for (let i = 0; i < 4; i++) reduce(s, DOWN);
    assert.equal(s.cursor, 2, "three results, and the selection stops at the end");
    reduce(s, UP);
    assert.equal(s.cursor, 1);
    unchangedBy(s, [PGUP, PGDN, RIGHT, LEFT], "none of these mean anything while typing");
    assert.equal(s.query, "extra-9", "and none of them joined the query text");
  });

  test("enter closes the query for editing without confirming; on an empty query it browses", () => {
    const s = fresh();
    openQuery(s, "extra-9");
    assert.equal(reduce(s, ENTER), null, "enter here must not confirm anything");
    assert.deepEqual([s.typing, s.query, searching(s)], [false, "extra-9", true]);
    assert.deepEqual(matchIds(s), ["w12:p1", "w12:t1", "w12"], "the results stay on screen");

    const t = fresh();
    reduce(t, RIGHT);
    reduce(t, SLASH);
    assert.equal(reduce(t, ENTER), null);
    assert.deepEqual([t.typing, t.query, searching(t)], [false, "", false]);
    reduce(t, digit(2));
    assert.equal(hovered(t, 1).id, "w1:t2", "back in browse, a digit is a jump key");
  });

  test("escape abandons the search and leaves browse as it was", () => {
    const s = fresh();
    reduce(s, DOWN);
    reduce(s, RIGHT);
    const before = snapshot(s);
    openQuery(s, "extra");
    assert.equal(reduce(s, ESC), null, "escape must not close the popup here");
    assert.equal(snapshot(s), before, "query, results and browse state all restored");
  });

  test("an empty query stays open, and leaves only on a further backspace", () => {
    const s = fresh();
    openQuery(s, "beta");
    for (let i = 0; i < 4; i++) reduce(s, BACKSPACE);
    assert.deepEqual([s.query, searching(s), s.typing], ["", false, true], "still typing after the last character goes");
    typeText(s, "alpha");
    assert.deepEqual([s.query, matchIds(s).length > 0], ["alpha", true], "so a fresh query can be typed straight away");

    const t = fresh();
    openQuery(t, "beta");
    reduce(t, CTRL_U);
    assert.deepEqual([t.query, t.typing], ["", true], "ctrl-u empties it without leaving");
    reduce(t, BACKSPACE);
    assert.deepEqual([t.typing, fastKeysActive(t)], [false, true], "backspace on the empty query goes back to browse");
    reduce(t, digit(2));
    assert.deepEqual([hovered(t, 0).id, t.depth], ["w2", 1], "and the digit is a jump key again");
  });
});

// ----------------------------------------------------------------- results

describe("results", () => {
  test("up, down and paging walk the results, nine to a page", () => {
    const s = results("extra");
    assert.deepEqual([s.matches.length, matchPageCount(s), matchPageItems(s).length], [30, 4, 9]);
    reduce(s, DOWN);
    reduce(s, DOWN);
    assert.equal(s.cursor, 2);
    reduce(s, UP);
    assert.equal(s.cursor, 1);
    reduce(s, PGDN);
    assert.deepEqual([s.matchPage, s.cursor], [1, 9]);
    reduce(s, PGUP);
    assert.deepEqual([s.matchPage, s.cursor], [0, 0]);
  });

  test("paging the results with nowhere to go changes nothing", () => {
    const s = results("extra");
    reduce(s, DOWN);
    reduce(s, DOWN);
    unchangedBy(s, [PGUP], "there is no page before the first");
    for (let i = 0; i < 3; i++) reduce(s, PGDN);
    assert.deepEqual([s.matchPage, s.cursor], [3, 27]);
    unchangedBy(s, [PGDN], "there is no page after the last");
  });

  test("a digit selects a result without confirming it; enter confirms", () => {
    const s = results("extra");
    assert.equal(reduce(s, digit(3)), null, "a digit must not confirm");
    assert.deepEqual([s.cursor, s.matches[s.cursor].item.id], [2, "w5:p1"]);
    reduce(s, PGDN);
    reduce(s, digit(2));
    assert.equal(s.cursor, 10, "counted from the top of the current page");
    reduce(s, PGDN);
    reduce(s, PGDN);
    unchangedBy(s, [digit(5)], "the last page holds three results");

    const t = results("extra-9");
    reduce(t, digit(3));
    const effect = reduce(t, ENTER);
    assert.deepEqual([effect.type, effect.item.id], ["select", "w12"], "a space can be confirmed");
  });

  test("slash reopens the query for editing, keeping what was typed", () => {
    const s = results("extra-9");
    assert.equal(reduce(s, SLASH), null);
    assert.deepEqual([s.typing, s.query], [true, "extra-9"]);
    assert.deepEqual(matchIds(s), ["w12:p1", "w12:t1", "w12"]);
    reduce(s, BACKSPACE);
    assert.deepEqual([s.query, s.matches.length], ["extra-", 30]);
  });

  test("escape clears the query and returns to browse; a second escape closes the popup", () => {
    const s = fresh();
    reduce(s, DOWN);
    const before = snapshot(s);
    openQuery(s, "extra");
    reduce(s, ENTER);
    assert.equal(reduce(s, ESC), null, "it must not close the popup");
    assert.equal(snapshot(s), before);
    assert.deepEqual(reduce(s, ESC), { type: "quit" });
  });

  test("keys with no meaning in the results do nothing", () => {
    const s = results("extra-9");
    reduce(s, DOWN);
    unchangedBy(s, [BACKSPACE, char("x"), RIGHT, LEFT], "not keys of this mode");
  });

  test("ctrl-u has no meaning once the query is closed for editing", () => {
    const s = results("extra-9");
    reduce(s, DOWN);
    unchangedBy(s, [CTRL_U], "ctrl-u only edits an open query");
  });

  test("the selection follows the item across a rebuild, not the row number", () => {
    const s = fresh();
    openQuery(s, "pane-10-11");
    assert.deepEqual(matchIds(s), ["w13:t10:p11"]);
    assert.equal(s.cursor, 0);
    reduce(s, BACKSPACE);
    assert.deepEqual([s.query, matchIds(s)], [
      "pane-10-1",
      ["w13:t10:p1", "w13:t10:p10", "w13:t10:p11"],
    ]);
    assert.equal(s.cursor, 2, "the selection moved with its item, row 0 is somebody else");
    assert.equal(s.matches[s.cursor].item.id, "w13:t10:p11");
  });

  test("the selection falls back to the first result when its item is gone", () => {
    const s = fresh();
    openQuery(s, "extra-9");
    reduce(s, DOWN);
    reduce(s, DOWN);
    reduce(s, DOWN);
    assert.deepEqual([s.cursor, s.matches[s.cursor].item.id], [2, "w12"]);
    reduce(s, SLASH);
    reduce(s, BACKSPACE);
    assert.equal(s.matches[s.cursor].item.id, "w12", "still there while the query is broader");
    typeText(s, "8");
    assert.deepEqual([s.query, matchIds(s)], ["extra-8", ["w11:p1", "w11:t1", "w11"]]);
    assert.deepEqual([s.cursor, s.matchPage], [0, 0], "w12 is gone, so the first result is taken");
  });
});

// --------------------------------------------------------- the key layer

describe("keys, config and width", () => {
  test("parseKeys reports digits, slash and unknown sequences apart from text", () => {
    assert.deepEqual(parseKeys("\x1b[B"), [DOWN]);
    assert.deepEqual(parseKeys("\x1b[6~"), [PGDN]);
    assert.deepEqual(parseKeys("\r"), [ENTER]);
    assert.deepEqual(parseKeys("\x1b"), [ESC]);
    assert.deepEqual(parseKeys("\x15"), [CTRL_U]);
    assert.deepEqual(parseKeys("\x7f"), [BACKSPACE]);
    assert.deepEqual(parseKeys("3"), [digit(3)]);
    assert.deepEqual(parseKeys("0"), [char("0")]);
    assert.deepEqual(parseKeys("/"), [SLASH]);
    assert.deepEqual(parseKeys("\x1b[Z"), [], "unknown escapes are dropped, not typed");
  });

  test("config parses output_template and renders it", () => {
    assert.equal(parseConfig('# note\noutput_template = "@{name} {id}" # trailing\n').outputTemplate, "@{name} {id}");
    assert.equal(parseConfig("").outputTemplate, "herdr:{name}({id})");
    assert.equal(
      renderTemplate("herdr:{name}({id}) {nope}", { name: "x", id: "w1", label: "x" }),
      "herdr:x(w1) {nope}",
    );
  });

  test("width counts CJK as two cells and combining marks as zero", () => {
    assert.equal(width("abc"), 3);
    assert.equal(width("閣樓冷氣"), 8);
    assert.equal(width("é"), 1);
    assert.equal(width("w6:pQ ▏"), 7);
  });
});
