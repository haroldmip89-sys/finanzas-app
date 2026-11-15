import { describe, expect, it } from "vitest";

import { AppError, isInUseError, pgErrorCode } from "./errors";

describe("AppError", () => {
  it("keeps code, message and field errors", () => {
    const error = new AppError("CONFLICT", "Duplicado", { name: "Ya existe" });

    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("CONFLICT");
    expect(error.message).toBe("Duplicado");
    expect(error.fieldErrors).toEqual({ name: "Ya existe" });
  });
});

describe("pgErrorCode", () => {
  it("reads the code from the error itself", () => {
    expect(pgErrorCode({ code: "23505" })).toBe("23505");
  });

  it("looks through the cause chain", () => {
    expect(pgErrorCode({ cause: { cause: { code: "23503" } } })).toBe("23503");
  });

  it("ignores values that are not a SQLSTATE", () => {
    expect(pgErrorCode({ code: "ECONNRESET" })).toBeUndefined();
    expect(pgErrorCode(new Error("x"))).toBeUndefined();
    expect(pgErrorCode(null)).toBeUndefined();
  });
});

describe("isInUseError", () => {
  it("is true for foreign key and restrict violations", () => {
    expect(isInUseError({ code: "23503" })).toBe(true);
    expect(isInUseError({ cause: { code: "23001" } })).toBe(true);
  });

  it("is false for other errors", () => {
    expect(isInUseError({ code: "23505" })).toBe(false);
    expect(isInUseError(new Error("x"))).toBe(false);
  });
});
