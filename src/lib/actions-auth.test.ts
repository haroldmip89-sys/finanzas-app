import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every exported server action must read the user from Clerk with
 * `requireUserId()`. The user id never comes from the client, so a new action
 * that forgets it would be open to anyone: this test makes that fail early.
 */

const SRC = join(__dirname, "..");

function actionFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return actionFiles(path);
    return name.endsWith(".actions.ts") ? [path] : [];
  });
}

/** The exported async functions of a source text, with their bodies. */
export function exportedActions(source: string): { name: string; body: string }[] {
  const starts = [...source.matchAll(/^export async function (\w+)/gm)];
  return starts.map((match, i) => ({
    name: match[1],
    body: source.slice(match.index, starts[i + 1]?.index ?? source.length),
  }));
}

describe("server actions are protected", () => {
  const files = actionFiles(SRC);

  it("finds the action files", () => {
    expect(files.length).toBeGreaterThanOrEqual(7);
  });

  it.each(files.map((f) => [f.slice(SRC.length + 1), f]))("%s", (_label, file) => {
    const source = readFileSync(file, "utf8");

    expect(source.startsWith('"use server"')).toBe(true);
    const actions = exportedActions(source);
    expect(actions.length).toBeGreaterThan(0);
    for (const action of actions) {
      expect(action.body, `${action.name} must call requireUserId()`).toContain("requireUserId()");
    }
  });

  it("detects an action that forgets requireUserId", () => {
    const unsafe = `"use server";
export async function leakAction() {
  return runAction(async () => service.list("someone"));
}
export async function okAction() {
  return runAction(async () => { const userId = await requireUserId(); return service.list(userId); });
}`;

    const missing = exportedActions(unsafe).filter((a) => !a.body.includes("requireUserId()"));

    expect(missing.map((a) => a.name)).toEqual(["leakAction"]);
  });
});
