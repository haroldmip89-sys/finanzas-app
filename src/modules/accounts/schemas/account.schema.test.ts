import { describe, expect, it } from "vitest";

import {
  accountFormSchema,
  accountInputSchema,
  toAccountInput,
} from "./account.schema";

describe("accountInputSchema", () => {
  it("accepts a valid account and trims the name", () => {
    const result = accountInputSchema.parse({
      name: "  BCP  ",
      type: "bank",
      initialBalanceCents: 12050,
    });

    expect(result.name).toBe("BCP");
  });

  it("accepts a negative balance (credit card)", () => {
    expect(
      accountInputSchema.safeParse({
        name: "Visa",
        type: "card",
        initialBalanceCents: -50000,
      }).success,
    ).toBe(true);
  });

  it("rejects empty or long names, bad types and non-integer balances", () => {
    const base = { name: "A", type: "cash", initialBalanceCents: 0 };

    expect(accountInputSchema.safeParse({ ...base, name: " " }).success).toBe(false);
    expect(accountInputSchema.safeParse({ ...base, name: "x".repeat(51) }).success).toBe(false);
    expect(accountInputSchema.safeParse({ ...base, type: "crypto" }).success).toBe(false);
    expect(accountInputSchema.safeParse({ ...base, initialBalanceCents: 1.5 }).success).toBe(false);
    expect(accountInputSchema.safeParse({ ...base, initialBalanceCents: "10" }).success).toBe(false);
  });

  it("rejects amounts out of range", () => {
    expect(
      accountInputSchema.safeParse({
        name: "A",
        type: "cash",
        initialBalanceCents: 1e15,
      }).success,
    ).toBe(false);
  });
});

describe("accountFormSchema", () => {
  const base = { name: "Caja", type: "cash" as const };

  it("accepts PEN amounts with up to 2 decimals", () => {
    for (const initialBalance of ["", "0", "12", "12.5", "-3.50"]) {
      expect(accountFormSchema.safeParse({ ...base, initialBalance }).success).toBe(true);
    }
  });

  it("rejects invalid amounts", () => {
    for (const initialBalance of ["abc", "1.234", "1,5", "-", "12."]) {
      expect(accountFormSchema.safeParse({ ...base, initialBalance }).success).toBe(false);
    }
  });
});

describe("toAccountInput", () => {
  it("treats an empty balance as 0", () => {
    expect(
      toAccountInput({ name: "Caja", type: "cash", initialBalance: "" }),
    ).toEqual({ name: "Caja", type: "cash", initialBalanceCents: 0 });
  });

  it("converts the PEN string to cents", () => {
    expect(
      toAccountInput({ name: "Caja", type: "cash", initialBalance: "12.50" }),
    ).toEqual({ name: "Caja", type: "cash", initialBalanceCents: 1250 });
  });
});
