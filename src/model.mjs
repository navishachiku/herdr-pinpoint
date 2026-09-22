// Pure picker state. No terminal, no herdr calls; everything here is unit-testable.
//
// Two modes, as in tmux's choose-tree and the navigator plugins built on it:
//
//   browse    three linked columns; bare digits are jump keys
//   query     `/` opens it; every printable key edits the query and the matches
//             rebuild live; anything else is discarded rather than typed
//
// Leaving the query with Enter keeps the matches on screen so the digits work
// on them; Escape drops the query and restores the full tree.

export const PAGE_SIZE = 9;
export const LEVELS = 3;
export const LEVEL_TITLES = ["Spaces", "Tabs", "Panes"];

/**
 * @typedef {{ id: string, label: string, name: string, children: Item[] }} Item
 *   label: text shown in the column, e.g. `hqcommit (claude)`;
 *   name: bare handle for the output template, e.g. `hqcommit`.
 * @typedef {{ item: Item, path: Item[], from: number, to: number }} Match
 *   path: the item's ancestors, outermost first; from/to: the matched run
 *   inside `pathText(match)`, for highlighting.
 * @typedef {{ root: Item[], depth: number, hover: number[], page: number[],
 *   query: string, typing: boolean, matches: Match[], cursor: number, matchPage: number }} State
 *   depth: column that receives navigation keys; every column left of it has an Actived item;
 *   hover, page: per column — index into the list and its 0-based page;
 *   typing: the query is open for editing; matches/cursor/matchPage: the results list.
 * @typedef {{ type: "up" | "down" | "choose" | "back" | "pageUp" | "pageDown"
 *   | "backspace" | "clear" | "enter" | "escape" | "query" }
 *   | { type: "digit", n: number } | { type: "input", char: string }} Action
 * @typedef {{ type: "select", item: Item } | { type: "quit" } | null} Effect
 */

/** @param {import("./herdr.mjs").Space[]} spaces @returns {Item[]} */
export function toItems(spaces) {
  return spaces.map((s) => ({
    id: s.id,
    label: s.label,
    name: s.label,
    children: s.tabs.map((t) => ({
      id: t.id,
      label: t.label,
      name: t.label,
      children: t.panes.map((p) => {
        const name = p.label ?? p.agentName ?? p.agent ?? "shell";
        const label = p.label ?? (p.agentName && p.agent ? `${p.agentName} (${p.agent})` : name);
        return { id: p.id, label, name, children: [] };
      }),
    })),
  }));
}

/** @param {Item[]} root @param {(string | null)[]} path @returns {State} */
export function initialState(root, path) {
  const state = {
    root,
    depth: 0,
    hover: [0, 0, 0],
    page: [0, 0, 0],
    query: "",
    typing: false,
    matches: [],
    cursor: 0,
    matchPage: 0,
  };
  let items = root;
  for (let level = 0; level < LEVELS; level++) {
    const idx = path[level] ? items.findIndex((it) => it.id === path[level]) : -1;
    if (idx < 0) break;
    state.hover[level] = idx;
    state.page[level] = Math.floor(idx / PAGE_SIZE);
    items = items[idx].children;
  }
  return state;
}

/** True while the results list replaces the three columns. */
export function searching(state) {
  return state.query !== "";
}

/** `space / tab / pane` for a match: the string the query is compared against. */
export function pathText(match) {
  return [...match.path, match.item].map((it) => it.label).join(" / ");
}

/**
 * Every item whose path contains the query, deepest level first so the pane a
 * query like `claude` means is what the cursor lands on.
 * @returns {Match[]}
 */
export function findMatches(root, query) {
  const q = query.toLowerCase();
  if (!q) return [];
  /** @type {Match[][]} */
  const byLevel = [[], [], []];
  const walk = (items, path) => {
    for (const item of items) {
      const text = [...path, item].map((it) => it.label).join(" / ");
      const from = text.toLowerCase().indexOf(q);
      if (from >= 0) byLevel[path.length].push({ item, path, from, to: from + q.length });
      walk(item.children, [...path, item]);
    }
  };
  walk(root, []);
  return [...byLevel[2], ...byLevel[1], ...byLevel[0]];
}

/** Items of one column, following the hover path from the root. */
export function column(state, level) {
  let items = state.root;
  for (let l = 0; l < level; l++) {
    const parent = items[state.hover[l]];
    if (!parent) return [];
    items = parent.children;
  }
  return items;
}

export function hovered(state, level) {
  return column(state, level)[state.hover[level]];
}

/** The item Enter would send, in either mode. */
export function current(state) {
  return searching(state) ? state.matches[state.cursor]?.item : hovered(state, state.depth);
}

export function pageCount(state, level) {
  return Math.max(1, Math.ceil(column(state, level).length / PAGE_SIZE));
}

/** Items visible on the column's current page. */
export function pageItems(state, level) {
  const start = state.page[level] * PAGE_SIZE;
  return column(state, level).slice(start, start + PAGE_SIZE);
}

export function matchPageCount(state) {
  return Math.max(1, Math.ceil(state.matches.length / PAGE_SIZE));
}

export function matchPageItems(state) {
  const start = state.matchPage * PAGE_SIZE;
  return state.matches.slice(start, start + PAGE_SIZE);
}

/** True when digits jump to a row instead of joining the query. */
export function fastKeysActive(state) {
  return !state.typing;
}

function resetBelow(state, level) {
  for (let l = level + 1; l < LEVELS; l++) {
    state.hover[l] = 0;
    state.page[l] = 0;
  }
}

function setHover(state, idx) {
  const count = column(state, state.depth).length;
  if (count === 0) return;
  const next = Math.max(0, Math.min(count - 1, idx));
  if (next === state.hover[state.depth]) return;
  state.hover[state.depth] = next;
  state.page[state.depth] = Math.floor(next / PAGE_SIZE);
  resetBelow(state, state.depth);
}

function setPage(state, page) {
  const next = Math.max(0, Math.min(pageCount(state, state.depth) - 1, page));
  if (next === state.page[state.depth]) return;
  state.page[state.depth] = next;
  setHover(state, next * PAGE_SIZE);
}

function setMatchPage(state, page) {
  const next = Math.max(0, Math.min(matchPageCount(state) - 1, page));
  if (next === state.matchPage) return;
  setCursor(state, next * PAGE_SIZE);
}

function setCursor(state, idx) {
  if (state.matches.length === 0) return;
  state.cursor = Math.max(0, Math.min(state.matches.length - 1, idx));
  state.matchPage = Math.floor(state.cursor / PAGE_SIZE);
}

/**
 * Rebuilds the results on every keystroke, keeping the cursor on the same item
 * where it survives the rebuild; an index would jump to an unrelated row as
 * matches come and go. A query that matches nothing shows an empty list.
 */
function setQuery(state, text) {
  if (text === state.query) return;
  const held = state.matches[state.cursor]?.item.id;
  const next = findMatches(state.root, text);
  state.query = text;
  state.matches = next;
  const kept = next.findIndex((m) => m.item.id === held);
  state.cursor = kept >= 0 ? kept : 0;
  state.matchPage = Math.floor(state.cursor / PAGE_SIZE);
}

function stopSearch(state) {
  state.query = "";
  state.typing = false;
  state.matches = [];
  state.cursor = 0;
  state.matchPage = 0;
}

/** @param {State} state @param {Action} action @returns {Effect} */
export function reduce(state, action) {
  if (state.typing) return reduceTyping(state, action);
  if (searching(state)) return reduceResults(state, action);
  return reduceBrowse(state, action);
}

/** Query open: printable keys edit it, everything else is discarded. */
function reduceTyping(state, action) {
  switch (action.type) {
    case "query":
      // `/` is ordinary text once the query is open, so a path can be typed.
      setQuery(state, state.query + "/");
      return null;
    case "input":
      setQuery(state, state.query + action.char);
      return null;
    case "digit":
      setQuery(state, state.query + String(action.n));
      return null;
    case "backspace":
      // Deleting past the first character leaves the query, so a typo on the
      // first keystroke costs one key rather than the whole search.
      if (state.query === "") stopSearch(state);
      else setQuery(state, state.query.slice(0, -1));
      return null;
    case "clear":
      setQuery(state, "");
      return null;
    // Arrows move the focus out of the query box and onto the results, so the
    // first press lands on a row rather than stepping past one. Nothing is
    // selected while the text is still being typed.
    case "up":
      if (!searching(state)) return null;
      state.typing = false;
      setCursor(state, state.matches.length - 1);
      return null;
    case "down":
      if (!searching(state)) return null;
      state.typing = false;
      setCursor(state, 0);
      return null;
    case "enter":
      // Leave the query closed but keep what it found.
      if (state.query === "") stopSearch(state);
      else state.typing = false;
      return null;
    case "escape":
      stopSearch(state);
      return null;
    default:
      return null;
  }
}

/** Query closed but still narrowing: digits jump, Enter sends. */
function reduceResults(state, action) {
  switch (action.type) {
    case "query":
      state.typing = true;
      return null;
    case "up":
      // Past the first row the focus goes back into the query box.
      if (state.cursor === 0) state.typing = true;
      else setCursor(state, state.cursor - 1);
      return null;
    case "down":
      setCursor(state, state.cursor + 1);
      return null;
    case "pageUp":
      setMatchPage(state, state.matchPage - 1);
      return null;
    case "pageDown":
      setMatchPage(state, state.matchPage + 1);
      return null;
    case "digit": {
      const idx = state.matchPage * PAGE_SIZE + action.n - 1;
      if (idx >= state.matches.length) return null;
      setCursor(state, idx);
      return null;
    }
    case "enter": {
      const item = state.matches[state.cursor]?.item;
      return item ? { type: "select", item } : null;
    }
    case "escape":
      stopSearch(state);
      return null;
    default:
      return null;
  }
}

/** Three columns, bare digits jump. */
function reduceBrowse(state, action) {
  const d = state.depth;
  switch (action.type) {
    case "query":
      state.typing = true;
      return null;
    case "up":
      setHover(state, state.hover[d] - 1);
      return null;
    case "down":
      setHover(state, state.hover[d] + 1);
      return null;
    case "pageUp":
      setPage(state, state.page[d] - 1);
      return null;
    case "pageDown":
      setPage(state, state.page[d] + 1);
      return null;
    case "digit": {
      const idx = state.page[d] * PAGE_SIZE + action.n - 1;
      if (idx >= column(state, d).length) return null;
      setHover(state, idx);
      return choose(state);
    }
    case "choose":
      return choose(state);
    case "back":
      if (d > 0) state.depth = d - 1;
      return null;
    case "enter": {
      const item = hovered(state, d);
      return item ? { type: "select", item } : null;
    }
    case "escape":
      return { type: "quit" };
    default:
      return null;
  }
}

function choose(state) {
  if (!hovered(state, state.depth)) return null;
  if (state.depth < LEVELS - 1) state.depth += 1;
  return null;
}
