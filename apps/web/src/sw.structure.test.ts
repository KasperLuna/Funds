/**
 * Regression lock for the silent-push incident: the push, notificationclick,
 * and pushsubscriptionchange listeners MUST be registered at the top level of
 * sw.ts. A worker woken by a push event runs only top-level code — listeners
 * nested inside the fetch handler never exist in that fresh instance and the
 * notification is dropped with zero signal.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("./sw.ts", import.meta.url), "utf8");

interface Listener {
  name: string;
  depth: number;
}

// Single-pass scan: brace depth tracked only in normal code (strings and
// comments skipped). Template `${...}` needs no special handling here —
// sw.ts's only template expression has balanced braces and no quotes.
function listeners(source: string): Listener[] {
  const out: Listener[] = [];
  let depth = 0;
  let i = 0;
  const n = source.length;
  while (i < n) {
    const ch = source[i]!;
    if (ch === "/" && source[i + 1] === "/") {
      while (i < n && source[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && source[i + 1] === "*") {
      i += 2;
      while (i < n && !(source[i] === "*" && source[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      const start = i;
      i++;
      let name = "";
      while (i < n) {
        const c = source[i]!;
        if (c === "\\") {
          i += 2;
          continue;
        }
        if (c === quote) break;
        name += c;
        i++;
      }
      if (source.slice(0, start).endsWith("addEventListener(")) {
        out.push({ name, depth });
      }
      i++;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    i++;
  }
  return out;
}

describe("sw.ts top-level listeners", () => {
  it.each([
    "install",
    "activate",
    "fetch",
    "push",
    "notificationclick",
    "pushsubscriptionchange",
  ])("registers %s at depth 0 exactly once", (name) => {
    expect(listeners(src).filter((l) => l.name === name)).toEqual([
      { name, depth: 0 },
    ]);
  });
});
