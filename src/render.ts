import {
  LEVELS,
  fastKeysActive,
  LEVEL_TITLES,
  PAGE_SIZE,
  column,
  pageCount,
  pageItems,
  type State,
} from "./model";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

// Herdr's default palette (catppuccin, src/app/state.rs in the herdr repo).
// Plugins cannot read the active theme, so the default tokens are used as-is.
const rgb = (r: number, g: number, b: number) => `${r};${g};${b}`;
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
/** Fast keys render as a small chip, like herdr's own key hints. */
const KEY = `\x1b[48;2;${SURFACE1}m\x1b[38;2;${TEXT}m`;

const GUTTER = 1;
const GAP = 2;
/** Rows a boxed item takes: top border, content, bottom border. */
const BOX_ROWS = 3;
/** Boxed layout needs the search box, a gap, headers, nine boxes, and a gap before the footer. */
const BOXED_MIN_ROWS = 3 + 1 + 1 + PAGE_SIZE * BOX_ROWS + 1;

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

interface Cell {
  label: string;
  key: string | null;
  style: string;
  /** Background applied to the content row (hover only). */
  bg: string;
}

function cellData(state: State, level: number, row: number): Cell | null {
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
function boxedCell(cell: Cell | null, colWidth: number): string[] {
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
function compactCell(cell: Cell | null, colWidth: number): string {
  if (!cell) return " ".repeat(colWidth);
  const badge = cell.key ? `${KEY} ${cell.key} ${RESET}${cell.bg}` : "   ";
  const label = fit(cell.label, colWidth - 5);
  return `${cell.bg} ${cell.style}${pad(label, colWidth - 5)}${RESET}${cell.bg}${badge} ${RESET}`;
}

function joinColumns(parts: string[]): string {
  return " ".repeat(GUTTER) + parts.join(" ".repeat(GAP));
}

function searchBox(state: State, inner: number): string[] {
  const filter = state.filter[state.depth];
  const placeholder = "Type to filter";
  const text = filter ? `${filter}\u258f` : placeholder;
  const styled = filter ? `${BOLD}${text}${RESET}` : `${DIM}${text}${RESET}`;
  const border = filter ? ACCENT_BORDER : BORDER;
  return [
    `${border}\u256d${"\u2500".repeat(inner)}\u256e${RESET}`,
    `${border}\u2502${RESET} ${styled}${" ".repeat(Math.max(0, inner - 1 - width(text)))}${border}\u2502${RESET}`,
    `${border}\u2570${"\u2500".repeat(inner)}\u256f${RESET}`,
  ].map((line) => " ".repeat(GUTTER) + line);
}

function headers(state: State, colWidth: number): string {
  return joinColumns(
    Array.from({ length: LEVELS }, (_, level) => {
      const count = column(state, level).length;
      const title = `${LEVEL_TITLES[level]} (${count ? state.page[level] + 1 : 0}/${count ? pageCount(state, level) : 0})`;
      const style = level === state.depth ? BOLD : DIM;
      return `${style}${pad(title, colWidth)}${RESET}`;
    }),
  );
}

const HINTS = [
  "Type : Filter",
  "\u2191/\u2193 : Select",
  "\u2190 : Back",
  "\u2192 : Choose",
  "1~9 : Fast key",
  "PgUp/PgDn : Page",
  "Ctrl-U : Clear",
  "Enter : Confirm",
  "Esc : Clear / Close",
];

/** Packs the key hints into as few lines as the width allows. */
function footer(cols: number, preview: string): string[] {
  const g = " ".repeat(GUTTER);
  const max = cols - GUTTER * 2;
  const lines: string[] = [];
  let current = "";
  for (const hint of HINTS) {
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
    `${g}${DIM}Enter sends${RESET}  ${preview}`,
  ];
}

export function render(state: State, cols: number, rows: number, preview: string): string {
  const inner = Math.max(30, cols - GUTTER * 2);
  const colWidth = Math.floor((inner - GAP * (LEVELS - 1)) / LEVELS);
  const bottom = footer(cols, preview);
  const boxed = rows >= BOXED_MIN_ROWS + bottom.length;

  const lines: string[] = [...searchBox(state, inner - 2), "", headers(state, colWidth)];

  for (let row = 0; row < PAGE_SIZE; row++) {
    const cells = Array.from({ length: LEVELS }, (_, level) => cellData(state, level, row));
    if (boxed) {
      const boxes = cells.map((cell) => boxedCell(cell, colWidth));
      for (let r = 0; r < BOX_ROWS; r++) lines.push(joinColumns(boxes.map((b) => b[r])));
    } else {
      lines.push(joinColumns(cells.map((cell) => compactCell(cell, colWidth))));
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
