import { redirect } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { unwrapResult, ActionFailure } from "./action-result";
import { AppError } from "./errors";
import { runAction } from "./run-action";

describe("runAction", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("wraps a returned value", async () => {
    await expect(runAction(async () => 42)).resolves.toEqual({
      ok: true,
      data: 42,
    });
  });

  it("converts an AppError keeping its safe message", async () => {
    const result = await runAction(async () => {
      throw new AppError("NOT_FOUND", "No existe", { id: "x" });
    });

    expect(result).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: "No existe", fieldErrors: { id: "x" } },
    });
  });

  it("converts a ZodError into VALIDATION with field errors", async () => {
    const result = await runAction(async () => {
      z.object({ name: z.string().min(1, "Obligatorio") }).parse({ name: "" });
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "VALIDATION", fieldErrors: { name: "Obligatorio" } },
    });
  });

  it("converts Postgres unique and foreign key errors", async () => {
    const unique = await runAction(async () => {
      throw Object.assign(new Error("raw sql text"), { code: "23505" });
    });
    const fk = await runAction(async () => {
      throw { cause: { code: "23503" } };
    });

    expect(unique).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    expect(fk).toMatchObject({ ok: false, error: { code: "IN_USE" } });
  });

  it("hides raw messages of unexpected errors and logs them", async () => {
    const result = await runAction(async () => {
      throw new Error("password=secret host=db.internal");
    });

    expect(result).toMatchObject({ ok: false, error: { code: "INTERNAL" } });
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(console.error).toHaveBeenCalled();
  });

  it("does not log the values of a failed query", async () => {
    await runAction(async () => {
      throw new Error('Failed query: insert into "accounts" ("name") values ($1)\nparams: Mi cuenta,9900');
    });

    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).toContain("Failed query");
    expect(logged).not.toContain("Mi cuenta");
    expect(logged).not.toContain("9900");
  });

  it("re-throws Next.js control-flow exceptions", async () => {
    await expect(
      runAction(async () => {
        redirect("/sign-in");
      }),
    ).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") });
  });
});

describe("unwrapResult", () => {
  it("returns data on success", () => {
    expect(unwrapResult({ ok: true, data: "a" })).toBe("a");
  });

  it("throws ActionFailure with code and field errors on failure", () => {
    try {
      unwrapResult({
        ok: false,
        error: { code: "CONFLICT", message: "Dup", fieldErrors: { name: "Dup" } },
      });
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ActionFailure);
      expect((error as ActionFailure).code).toBe("CONFLICT");
      expect((error as ActionFailure).fieldErrors).toEqual({ name: "Dup" });
    }
  });
});
