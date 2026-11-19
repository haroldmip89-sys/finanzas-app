import { describe, expect, it } from "vitest";

import { describeErrorForLog } from "./safe-log";

describe("describeErrorForLog", () => {
  it("keeps the name and the first line of the message", () => {
    const result = describeErrorForLog(new TypeError("Cannot read properties of undefined"));

    expect(result).toEqual({ name: "TypeError", message: "Cannot read properties of undefined" });
  });

  it("cuts the bound parameters Drizzle adds to the message", () => {
    const error = new Error(
      'Failed query: insert into "accounts" ("name") values ($1)\nparams: Efectivo de Harold,150050',
    );

    const text = JSON.stringify(describeErrorForLog(error));

    expect(text).toContain("Failed query");
    expect(text).not.toContain("Efectivo de Harold");
    expect(text).not.toContain("150050");
  });

  it("cuts a params part on the same line", () => {
    const text = JSON.stringify(
      describeErrorForLog(new Error("Failed query: select 1 params: secreto-123")),
    );

    expect(text).not.toContain("secreto-123");
  });

  it("never logs the Postgres detail, which holds the user's values", () => {
    const cause = Object.assign(new Error("duplicate key value violates unique constraint"), {
      code: "23505",
      detail: "Key (name)=(Cuenta de Harold) already exists.",
    });
    const error = Object.assign(new Error("Failed query"), { cause });

    const result = describeErrorForLog(error);

    expect(result.cause).toEqual({
      name: "Error",
      code: "23505",
      message: "duplicate key value violates unique constraint",
    });
    expect(JSON.stringify(result)).not.toContain("Harold");
  });

  it("handles values that are not errors", () => {
    expect(describeErrorForLog("boom")).toEqual({ name: "string", message: "" });
    expect(describeErrorForLog(undefined)).toEqual({ name: "undefined", message: "" });
    expect(describeErrorForLog(null)).toEqual({ name: "object", message: "" });
  });

  it("limits the length of the message", () => {
    const result = describeErrorForLog(new Error("x".repeat(1000)));

    expect(result.message).toHaveLength(300);
  });
});
