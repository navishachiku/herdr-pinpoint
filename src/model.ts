// Pure picker state. No terminal, no herdr calls; everything here is unit-testable.

import type { Space } from "./herdr";

export const PAGE_SIZE = 9;
export const LEVELS = 3;
export const LEVEL_TITLES = ["Spaces", "Tabs", "Panes"] as const;

export interface Item {
  id: string;
  /** Text shown in the column, e.g. `hqcommit (claude)`. */
  label: string;
  /** Bare handle for the output template, e.g. `hqcommit`. */
  name: string;
  children: Item[];
}

export interface State {
  root: Item[];
  /** Column that receives navigation keys; every column left of it has an Actived item. */
  depth: number;
  /** Per column: index into the filtered list. */
  hover: number[];
  /** Per column: 0-based page. */
  page: number[];
  /** Per column: search text. Typing always edits `filter[depth]`. */
  filter: string[];
}

export type Action =
  | { type: "up" }
  | { type: "down" }
  | { type: "choose" }
  | { type: "back" }
  | { type: "pageUp" }
  | { type: "pageDown" }
  | { type: "digit"; n: number }
  | { type: "input"; char: string }
  | { type: "backspace" }
  | { type: "clear" }
  | { type: "enter" }
  | { type: "escape" };

export type Effect = { type: "select"; item: Item } | { type: "quit" } | null;

export function toItems(spaces: Space[]): Item[] {
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
        const label =
          p.label ?? (p.agentName && p.agent ? `${p.agentName} (${p.agent})` : name);
        return { id: p.id, label, name, children: [] };
      }),
    })),
  }));
}

export function initialState(root: Item[], path: (string | null)[]): State {
  const state: State = {
    root,
    depth: 0,
    hover: [0, 0, 0],
    page: [0, 0, 0],
    filter: ["", "", ""],
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

function matches(item: Item, filter: string): boolean {
  const q = filter.toLowerCase();
  return item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q);
}

/** Filtered items of one column, following the hover path from the root. */
export function column(state: State, level: number): Item[] {
  let items = state.root;
  for (let l = 0; l < level; l++) {
    const parent = items.filter((it) => matches(it, state.filter[l]))[state.hover[l]];
    if (!parent) return [];
    items = parent.children;
  }
  return items.filter((it) => matches(it, state.filter[level]));
}

export function hovered(state: State, level: number): Item | undefined {
  return column(state, level)[state.hover[level]];
}

export function pageCount(state: State, level: number): number {
  return Math.max(1, Math.ceil(column(state, level).length / PAGE_SIZE));
}

/** Items visible on the column's current page. */
export function pageItems(state: State, level: number): Item[] {
  const start = state.page[level] * PAGE_SIZE;
  return column(state, level).slice(start, start + PAGE_SIZE);
}

function resetBelow(state: State, level: number): void {
  for (let l = level + 1; l < LEVELS; l++) {
    state.hover[l] = 0;
    state.page[l] = 0;
    state.filter[l] = "";
  }
}

function setHover(state: State, idx: number): void {
  const count = column(state, state.depth).length;
  if (count === 0) return;
  const next = Math.max(0, Math.min(count - 1, idx));
  if (next === state.hover[state.depth]) return;
  state.hover[state.depth] = next;
  state.page[state.depth] = Math.floor(next / PAGE_SIZE);
  resetBelow(state, state.depth);
}

function setPage(state: State, page: number): void {
  const next = Math.max(0, Math.min(pageCount(state, state.depth) - 1, page));
  state.page[state.depth] = next;
  setHover(state, next * PAGE_SIZE);
}

function setFilter(state: State, text: string): void {
  state.filter[state.depth] = text;
  state.hover[state.depth] = 0;
  state.page[state.depth] = 0;
  resetBelow(state, state.depth);
}

export function reduce(state: State, action: Action): Effect {
  const d = state.depth;
  switch (action.type) {
    case "input":
      setFilter(state, state.filter[d] + action.char);
      return null;
    case "backspace":
      setFilter(state, state.filter[d].slice(0, -1));
      return null;
    case "clear":
      setFilter(state, "");
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
      // Digits are fast keys only while nothing is typed; otherwise they are text.
      if (state.filter[d]) {
        setFilter(state, state.filter[d] + String(action.n));
        return null;
      }
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
      // Two-stage escape, as in fzf and VS Code's quick pick: clear the query first, then close.
      if (state.filter[d]) {
        setFilter(state, "");
        return null;
      }
      return { type: "quit" };
    default:
      return null;
  }
}

/** True when digits act as fast keys, i.e. nothing is typed in the current column. */
export function fastKeysActive(state: State): boolean {
  return state.filter[state.depth] === "";
}

function choose(state: State): Effect {
  if (!hovered(state, state.depth)) return null;
  if (state.depth < LEVELS - 1) state.depth += 1;
  return null;
}
