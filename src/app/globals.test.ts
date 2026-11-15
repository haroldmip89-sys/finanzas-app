import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(__dirname, "globals.css"), "utf8");

function tokens(selector: string): Set<string> {
  const start = css.indexOf(`${selector} {`);
  const end = css.indexOf("\n}", start);
  const block = css.slice(start, end);
  return new Set([...block.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map((m) => m[1]));
}

describe("globals.css tokens", () => {
  const light = tokens(":root");
  const dark = tokens(".dark");

  it("defines the same colour tokens in light and dark", () => {
    // --radius is a size, not a colour: it lives only in :root.
    const colours = (set: Set<string>) => [...set].filter((t) => t !== "--radius").sort();
    expect(colours(dark)).toEqual(colours(light));
  });

  it("defines the money semantic tokens", () => {
    for (const name of ["income", "expense", "debt", "warning", "success", "info"]) {
      expect(light.has(`--${name}`)).toBe(true);
      expect(light.has(`--${name}-foreground`)).toBe(true);
    }
  });

  it("exposes the semantic tokens to Tailwind", () => {
    for (const name of ["income", "expense", "debt", "warning", "success", "info"]) {
      expect(css).toContain(`--color-${name}: var(--${name});`);
    }
  });
});
