import {
  LEVELS,
  LEVEL_TITLES,
  PAGE_SIZE,
  column,
  fastKeysActive,
  matchPageCount,
  matchPageItems,
  pageCount,
  pageItems,
  pathText,
  searching,
} from "./model.mjs";
import { width } from "./width.mjs";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

// Herdr's default palette (catppuccin, src/app/state.rs in the herdr repo).
// Plugins cannot read the active theme, so the default tokens are used as-is.
const rgb = (r, g, b) => `${r};${g};${b}`;
const ACCENT = rgb(137, 180, 250);
const OVERLAY0 = rgb(108, 112, 134);
const SELECTION_BG = rgb(49, 50, 68);
const SURFACE1 = rgb(69, 71, 90);
const TEXT = rgb(205, 214, 244);

const DIM = `\x1b[38;2;${OVERLAY0}m`;
const BORDER = DIM;
/** Hover mirrors herdr's selected row: accent border, accent bold text on the selection background. */
const HOVER = `\x1b[1;38;2;${ACCENT}m`;
const HOVER_BG = `\x1b[48;2;${SELECTION_BG}m`;
/** Actived keeps the accent without the emphasis, so the hover stays the single focal point. */
const ACTIVED = `\x1b[38;2;${ACCENT}m`;
const ACCENT_BORDER = ACTIVED;
/** Matched characters: yellow, the one colour not used for selection. */
const MATCH = `\x1b[1;38;2;249;226;175m`;
/** Fast keys render as a small chip, like herdr's own key hints. */
const KEY = `\x1b[48;2;${SURFACE1}m\x1b[38;2;${TEXT}m`;

const GUTTER = 1;
const GAP = 2;
/** Rows a boxed item takes: top border, content, bottom border. */
const BOX_ROWS = 3;
/** Boxed layout needs the search box, a gap, headers, nine boxes, and a gap before the footer. */
const BOXED_MIN_ROWS = 3 + 1 + 1 + PAGE_SIZE * BOX_ROWS + 1;

function fit(s, max) {
  if (width(s) <= max) return s;
  let out = "";
  for (const ch of s) {
    if (width(out + ch) > max - 1) break;
    out += ch;
  }
  return out + "…";
}

function pad(s, max) {
  return s + " ".repeat(Math.max(0, max - width(s)));
}

/**
 * @typedef {{ label: string, key: string | null, style: string, bg: string }} Cell
 *   bg: background applied to the content row (hover only).
 */

/** @returns {Cell | null} */
function cellData(state, level, row) {
  const item = pageItems(state, level)[row];
  if (!item) return null;
  const absolute = state.page[level] * PAGE_SIZE + row;
  const selected = absolute === state.hover[level];
  // Exactly one hover exists, in the current column; columns to its left show
  // their Actived item, columns to its right show nothing.
  const isHover = selected && level === state.depth;
  const isActived = selected && level < state.depth;
  return {
    label: item.label,
    key: level === state.depth && fastKeysActive(state) ? String(row + 1) : null,
    style: isActived ? ACTIVED : isHover ? HOVER : "",
    bg: isHover ? HOVER_BG : "",
  };
}

/** Rounded box, three rows, the key drawn as a small badge at the right edge. */
function boxedCell(cell, colWidth) {
  const blank = " ".repeat(colWidth);
  if (!cell) return [blank, blank, blank];
  const inner = colWidth - 2;
  const border = cell.style ? ACCENT_BORDER : BORDER;
  const badge = cell.key ? ` ${KEY} ${cell.key} ${RESET}${cell.bg}` : "";
  const badgeWidth = cell.key ? 4 : 0;
  const label = fit(cell.label, inner - 2 - badgeWidth);
  const content = `${cell.bg} ${cell.style}${pad(label, inner - 1 - badgeWidth)}${RESET}${cell.bg}${badge}${RESET}`;
  return [
    `${border}╭${"─".repeat(inner)}╮${RESET}`,
    `${border}│${RESET}${content}${border}│${RESET}`,
    `${border}╰${"─".repeat(inner)}╯${RESET}`,
  ];
}

/** One-row fallback for short terminals. */
function compactCell(cell, colWidth) {
  if (!cell) return " ".repeat(colWidth);
  const badge = cell.key ? `${KEY} ${cell.key} ${RESET}${cell.bg}` : "   ";
  const label = fit(cell.label, colWidth - 5);
  return `${cell.bg} ${cell.style}${pad(label, colWidth - 5)}${RESET}${cell.bg}${badge} ${RESET}`;
}

function joinColumns(parts) {
  return " ".repeat(GUTTER) + parts.join(" ".repeat(GAP));
}

function searchBox(state, inner) {
  const empty = !searching(state) && !state.typing;
  const text = state.typing ? `${state.query}\u258f` : state.query || "/  search";
  const count = searching(state)
    ? state.matches.length
      ? `${state.matches.length} matches`
      : "no matches"
    : "";
  const styled = empty ? `${DIM}${text}${RESET}` : `${BOLD}${text}${RESET}`;
  const border = state.typing || searching(state) ? ACCENT_BORDER : BORDER;
  const gap = Math.max(1, inner - 1 - width(text) - width(count) - 1);
  const body = ` ${styled}${" ".repeat(gap)}${DIM}${count}${RESET} `;
  return [
    `${border}\u256d${"\u2500".repeat(inner)}\u256e${RESET}`,
    `${border}\u2502${RESET}${body}${border}\u2502${RESET}`,
    `${border}\u2570${"\u2500".repeat(inner)}\u256f${RESET}`,
  ].map((line) => " ".repeat(GUTTER) + line);
}

/** One result row: `space / tab / pane` with the matched run picked out. */
function resultCell(state, match, row, inner) {
  const absolute = state.matchPage * PAGE_SIZE + row;
  // While the query is still being typed nothing is selected, so no row may
  // look ready to send.
  const selected = !state.typing && absolute === state.cursor;
  const border = selected ? ACCENT_BORDER : BORDER;
  const bg = selected ? HOVER_BG : "";
  const style = selected ? HOVER : "";
  const badge = fastKeysActive(state) ? ` ${KEY} ${row + 1} ${RESET}${bg}` : "";
  const badgeWidth = fastKeysActive(state) ? 4 : 0;
  const id = ` ${match.item.id} `;
  const room = inner - 1 - badgeWidth - width(id);
  const text = fit(pathText(match), room);

  let body;
  if (match.from < 0 || match.from >= text.length) {
    body = `${style}${pad(text, room)}${RESET}`;
  } else {
    const to = Math.min(match.to, text.length);
    body =
      `${style}${text.slice(0, match.from)}${RESET}${bg}` +
      `${MATCH}${text.slice(match.from, to)}${RESET}${bg}` +
      `${style}${pad(text.slice(to), room - width(text.slice(0, to)))}${RESET}${bg}`;
  }

  const content = `${bg}${badge} ${body}${bg}${DIM}${id}${RESET}`;
  return [
    `${border}\u256d${"\u2500".repeat(inner)}\u256e${RESET}`,
    `${border}\u2502${RESET}${content}${border}\u2502${RESET}`,
    `${border}\u2570${"\u2500".repeat(inner)}\u256f${RESET}`,
  ].map((line) => " ".repeat(GUTTER) + line);
}

function resultsHeader(state, inner) {
  const title = `Results (${state.matches.length ? state.matchPage + 1 : 0}/${state.matches.length ? matchPageCount(state) : 0})`;
  return " ".repeat(GUTTER) + `${BOLD}${pad(title, inner)}${RESET}`;
}

function headers(state, colWidth) {
  return joinColumns(
    Array.from({ length: LEVELS }, (_, level) => {
      const count = column(state, level).length;
      const title = `${LEVEL_TITLES[level]} (${count ? state.page[level] + 1 : 0}/${count ? pageCount(state, level) : 0})`;
      const style = level === state.depth ? BOLD : DIM;
      return `${style}${pad(title, colWidth)}${RESET}`;
    }),
  );
}

const BROWSE_HINTS = [
  "\u2191/\u2193 : Select",
  "\u2190 : Back",
  "\u2192 : Choose",
  "1~9 : Fast key",
  "PgUp/PgDn : Page",
  "/ : Search",
  "Enter : Confirm",
  "Esc : Close",
];

const TYPING_HINTS = [
  "Type : Search everything",
  "Enter or \u2191/\u2193 : Pick from the results",
  "Ctrl-U : Clear",
  "Esc : Back to columns",
];

const RESULT_HINTS = [
  "\u2191/\u2193 : Select",
  "1~9 : Fast key",
  "PgUp/PgDn : Page",
  "/ : Edit search",
  "Enter : Confirm",
  "Esc : Back to columns",
];

/** Packs the key hints into as few lines as the width allows. */
function footer(cols, preview, hints) {
  const g = " ".repeat(GUTTER);
  const max = cols - GUTTER * 2;
  const lines = [];
  let current = "";
  for (const hint of hints) {
    const next = current ? `${current}    ${hint}` : hint;
    if (width(next) > max && current) {
      lines.push(current);
      current = hint;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return [
    ...lines.map((line) => `${g}${DIM}${line}${RESET}`),
    preview ? `${g}${DIM}Enter sends${RESET}  ${preview}` : `${g}`,
  ];
}

/**
 * @param {import("./model.mjs").State} state
 * @param {number} cols @param {number} rows
 * @param {string} preview  what Enter would send
 */
export function render(state, cols, rows, preview) {
  const inner = Math.max(30, cols - GUTTER * 2);
  const colWidth = Math.floor((inner - GAP * (LEVELS - 1)) / LEVELS);
  const hints = state.typing ? TYPING_HINTS : searching(state) ? RESULT_HINTS : BROWSE_HINTS;
  const bottom = footer(cols, preview, hints);
  const boxed = rows >= BOXED_MIN_ROWS + bottom.length;

  const lines = [...searchBox(state, inner - 2), ""];

  if (searching(state)) {
    lines.push(resultsHeader(state, inner));
    const rowsShown = matchPageItems(state);
    for (let row = 0; row < PAGE_SIZE; row++) {
      const match = rowsShown[row];
      if (!match) {
        lines.push(...(boxed ? ["", "", ""] : [""]));
        continue;
      }
      const cell = resultCell(state, match, row, inner - 2);
      lines.push(...(boxed ? cell : [cell[1]]));
    }
  } else {
    lines.push(headers(state, colWidth));
    for (let row = 0; row < PAGE_SIZE; row++) {
      const cells = Array.from({ length: LEVELS }, (_, level) => cellData(state, level, row));
      if (boxed) {
        const boxes = cells.map((cell) => boxedCell(cell, colWidth));
        for (let r = 0; r < BOX_ROWS; r++) lines.push(joinColumns(boxes.map((b) => b[r])));
      } else {
        lines.push(joinColumns(cells.map((cell) => compactCell(cell, colWidth))));
      }
    }
  }

  // Pin the footer to the last rows; whatever is between stays blank.
  const body = lines.slice(0, Math.max(0, rows - bottom.length));
  while (body.length < rows - bottom.length) body.push("");
  return [...body, ...bottom]
    .slice(0, rows)
    .map((line, i) => `\x1b[${i + 1};1H\x1b[2K${line}`)
    .join("");
}
