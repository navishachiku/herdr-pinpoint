import {
  LEVELS,
  LEVEL_TITLES,
  PAGE_SIZE,
  column,
  pageCount,
  pageItems,
  type State,
} from "./model";

const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const HOVER = "\x1b[7m";
const ACTIVED = "\x1b[45;97m";
const KEY = "\x1b[33m";

const GUTTER = 1;
const GAP = 2;

const width = (s: string) => Bun.stringWidth(s);

function fit(s: string, max: number): string {
  if (width(s) <= max) return s;
  let out = "";
  for (const ch of s) {
    if (width(out + ch) > max - 1) break;
    out += ch;
  }
  return out + "…";
}

function pad(s: string, max: number): string {
  return s + " ".repeat(Math.max(0, max - width(s)));
}

function cell(state: State, level: number, row: number, colWidth: number): string {
  const item = pageItems(state, level)[row];
  if (!item) return " ".repeat(colWidth);

  const absolute = state.page[level] * PAGE_SIZE + row;
  const isHover = absolute === state.hover[level];
  const isActived = isHover && level < state.depth;
  const showKey = level === state.depth;

  const key = showKey ? `${row + 1} ` : "  ";
  const id = ` ${item.id}`;
  const label = fit(item.label, colWidth - key.length - width(id));
  const body = pad(key + label, colWidth - width(id)) + id;

  if (isActived) return `${ACTIVED}${BOLD}${body}${RESET}`;
  if (isHover) return `${HOVER}${body}${RESET}`;
  return `${KEY}${key}${RESET}${body.slice(key.length, body.length - id.length)}${DIM}${id}${RESET}`;
}

export function render(state: State, cols: number, rows: number): string {
  const inner = Math.max(30, cols - GUTTER * 2);
  const colWidth = Math.floor((inner - GAP * (LEVELS - 1)) / LEVELS);
  const margin = " ".repeat(GUTTER);
  const lines: string[] = [];

  const filter = state.filter[state.depth];
  const prompt = state.search ? `/ ${filter}▏` : filter ? `/ ${filter}` : `${DIM}/ search${RESET}`;
  lines.push(margin + `${BOLD}SEARCH${RESET}  ${prompt}`);
  lines.push("");

  lines.push(
    margin +
      Array.from({ length: LEVELS }, (_, level) => {
        const count = column(state, level).length;
        const title = `${LEVEL_TITLES[level]} (${count ? state.page[level] + 1 : 0}/${count ? pageCount(state, level) : 0})`;
        const styled = level === state.depth ? `${BOLD}${title}${RESET}` : `${DIM}${title}${RESET}`;
        return pad(styled, colWidth + styled.length - title.length);
      }).join(" ".repeat(GAP)),
  );

  for (let row = 0; row < PAGE_SIZE; row++) {
    lines.push(
      margin +
        Array.from({ length: LEVELS }, (_, level) => cell(state, level, row, colWidth)).join(
          " ".repeat(GAP),
        ),
    );
  }

  lines.push("");
  lines.push(margin + `${DIM}↑/↓ Select   ←  Back   → Choose   Enter Confirm   Esc Close${RESET}`);
  lines.push(margin + `${DIM}PgUp/PgDn Switch page   1~9 Fast key   / Search${RESET}`);

  return lines
    .slice(0, rows)
    .map((line, i) => `\x1b[${i + 1};1H\x1b[2K${line}`)
    .join("");
}
