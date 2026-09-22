// Display width of a string in terminal cells.

// Scripts and symbols a terminal draws two cells wide. Unicode's East_Asian_Width
// property is not available to regular expressions in Node, so the wide scripts
// and the fullwidth blocks are named individually.
const WIDE =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Bopomofo}\p{Script=Yi}]|\p{Extended_Pictographic}|[　-〾㇀-㇯㈀-㏿︰-﹏！-｠￠-￦]/u;

const ZERO_WIDTH = /\p{Mark}|\p{Default_Ignorable_Code_Point}|[​-‏]/u;

/** @param {string} s */
export function width(s) {
  let w = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp < 0x20 || (cp >= 0x7f && cp < 0xa0)) continue;
    if (ZERO_WIDTH.test(ch)) continue;
    w += WIDE.test(ch) ? 2 : 1;
  }
  return w;
}
