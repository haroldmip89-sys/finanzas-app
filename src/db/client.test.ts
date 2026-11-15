import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("db client", () => {
  const original = process.env.DATABASE_URL;

  beforeEach(() => {
    vi.resetModules();
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = original;
  });

  it("does not throw when imported without DATABASE_URL", async () => {
    await expect(import("./client")).resolves.toBeDefined();
  });

  it("throws a clear error when used without DATABASE_URL", async () => {
    const { db } = await import("./client");

    expect(() => db.select).toThrow(/DATABASE_URL.*\.env\.local/);
  });
});
