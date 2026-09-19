import type { Action } from "./model";

const SEQUENCES: Record<string, Action> = {
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
};

/**
 * Maps one stdin chunk to actions. In search mode printable characters become
 * `input`; otherwise `/` opens search and digits 1–9 are fast keys.
 */
export function parseKeys(chunk: string, search: boolean): Action[] {
  const known = SEQUENCES[chunk];
  if (known) return [known];
  if (chunk.startsWith("\x1b")) return [];

  const actions: Action[] = [];
  for (const char of chunk) {
    if (search) {
      if (char >= " " && char !== "\x7f") actions.push({ type: "input", char });
    } else if (char === "/") {
      actions.push({ type: "search" });
    } else if (char >= "1" && char <= "9") {
      actions.push({ type: "digit", n: Number(char) });
    }
  }
  return actions;
}
