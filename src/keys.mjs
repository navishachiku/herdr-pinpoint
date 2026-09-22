/** @type {Record<string, import("./model.mjs").Action>} */
const SEQUENCES = {
  "\x1b[A": { type: "up" },
  "\x1b[B": { type: "down" },
  "\x1b[C": { type: "choose" },
  "\x1b[D": { type: "back" },
  "\x1bOA": { type: "up" },
  "\x1bOB": { type: "down" },
  "\x1bOC": { type: "choose" },
  "\x1bOD": { type: "back" },
  "\x1b[5~": { type: "pageUp" },
  "\x1b[6~": { type: "pageDown" },
  "\r": { type: "enter" },
  "\n": { type: "enter" },
  "\x1b": { type: "escape" },
  "\x7f": { type: "backspace" },
  "\x08": { type: "backspace" },
  "\x03": { type: "escape" }, // ctrl+c
  "\x15": { type: "clear" }, // ctrl+u
};

/**
 * Maps one stdin chunk to actions. `/` opens the query, digits are reported
 * apart from other text, and the model decides what each means in the mode
 * it is in; unknown escape sequences are dropped rather than typed.
 * @param {string} chunk @returns {import("./model.mjs").Action[]}
 */
export function parseKeys(chunk) {
  const known = SEQUENCES[chunk];
  if (known) return [known];
  if (chunk.startsWith("\x1b")) return [];

  const actions = [];
  for (const char of chunk) {
    if (char === "/") actions.push({ type: "query" });
    else if (char >= "1" && char <= "9") actions.push({ type: "digit", n: Number(char) });
    else if (char >= " " && char !== "\x7f") actions.push({ type: "input", char });
  }
  return actions;
}
