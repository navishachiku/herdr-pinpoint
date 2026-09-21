// Display width of a string in terminal cells. Node has no public API for
// this; the ranges below cover CJK, Hangul, fullwidth forms, and emoji, which
// is what shows up in pane titles and workspace labels.

const WIDE = [
  [0x1100, 0x115f],
  [0x2e80, 0x303e],
  [0x3041, 0x33ff],
  [0x3400, 0x4dbf],
  [0x4e00, 0x9fff],
  [0xa000, 0xa4cf],
  [0xac00, 0xd7a3],
  [0xf900, 0xfaff],
  [0xfe30, 0xfe4f],
  [0xff00, 0xff60],
  [0xffe0, 0xffe6],
  [0x1f300, 0x1f64f],
  [0x1f900, 0x1f9ff],
  [0x20000, 0x2fffd],
  [0x30000, 0x3fffd],
];

function isWide(cp) {
  return WIDE.some(([lo, hi]) => cp >= lo && cp <= hi);
}

function isZeroWidth(cp) {
  return (
    (cp >= 0x0300 && cp <= 0x036f) ||
    (cp >= 0x200b && cp <= 0x200f) ||
    cp === 0xfe0f ||
    (cp >= 0xe0100 && cp <= 0xe01ef)
  );
}

/** @param {string} s */
export function width(s) {
  let w = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp < 0x20 || (cp >= 0x7f && cp < 0xa0) || isZeroWidth(cp)) continue;
    w += isWide(cp) ? 2 : 1;
  }
  return w;
}
