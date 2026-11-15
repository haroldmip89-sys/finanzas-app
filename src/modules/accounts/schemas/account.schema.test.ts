import { describe, expect, it } from "vitest";

import {
  accountFormSchema,
  accountInputSchema,
  balanceToFormValue,
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
    ).toEqual({ name: "Caja", type: "cash", initialBalanceCents: 0, includeInAvailable: undefined });
  });

  it("converts the PEN string to cents", () => {
    expect(
      toAccountInput({ name: "Caja", type: "cash", initialBalance: "12.50" }),
    ).toEqual({ name: "Caja", type: "cash", initialBalanceCents: 1250 });
  });
});

describe("card debt in positive", () => {
  it("stores a typed debt of a card as a negative balance", () => {
    expect(
      toAccountInput({ name: "Visa", type: "card", initialBalance: "350.50" }),
    ).toEqual({ name: "Visa", type: "card", initialBalanceCents: -35050, includeInAvailable: true });
  });

  it("keeps the sign as typed for other accounts", () => {
    expect(
      toAccountInput({ name: "BBVA", type: "bank", initialBalance: "350.50" }).initialBalanceCents,
    ).toBe(35050);
    expect(
      toAccountInput({ name: "BBVA", type: "bank", initialBalance: "-20" }).initialBalanceCents,
    ).toBe(-2000);
  });

  it("treats an empty debt and a zero debt as 0 without a negative zero", () => {
    for (const initialBalance of ["", "0", "0.00"]) {
      const cents = toAccountInput({ name: "Visa", type: "card", initialBalance }).initialBalanceCents;
      expect(cents).toBe(0);
      expect(Object.is(cents, -0)).toBe(false);
    }
  });

  it("a negative typed value on a card means credit in favor (positive balance)", () => {
    expect(
      toAccountInput({ name: "Visa", type: "card", initialBalance: "-50" }).initialBalanceCents,
    ).toBe(5000);
  });

  it("shows a card's stored negative balance as a positive debt in the form", () => {
    expect(balanceToFormValue("card", -35050)).toBe("350.50");
    expect(balanceToFormValue("card", 0)).toBe("0.00");
    expect(balanceToFormValue("card", 5000)).toBe("-50.00");
  });

  it("shows other accounts as stored", () => {
    expect(balanceToFormValue("bank", 35050)).toBe("350.50");
    expect(balanceToFormValue("cash", -2000)).toBe("-20.00");
  });

  it("round-trips for every type", () => {
    for (const type of ["cash", "bank", "card", "wallet"] as const) {
      for (const stored of [-35050, 0, 12000]) {
        const shown = balanceToFormValue(type, stored);
        expect(toAccountInput({ name: "X", type, initialBalance: shown }).initialBalanceCents).toBe(stored);
      }
    }
  });
});

describe("includeInAvailable (reserve toggle)", () => {
  it("is optional in the server contract and boolean when given", () => {
    const base = { name: "A", type: "bank", initialBalanceCents: 0 };

    expect(accountInputSchema.safeParse(base).success).toBe(true);
    expect(accountInputSchema.safeParse({ ...base, includeInAvailable: false }).success).toBe(true);
    expect(accountInputSchema.safeParse({ ...base, includeInAvailable: "no" }).success).toBe(false);
  });

  it("keeps the choice of a liquid account and forces cards to included", () => {
    expect(
      toAccountInput({ name: "Ahorro", type: "bank", initialBalance: "", includeInAvailable: false })
        .includeInAvailable,
    ).toBe(false);
    expect(
      toAccountInput({ name: "Visa", type: "card", initialBalance: "", includeInAvailable: false })
        .includeInAvailable,
    ).toBe(true);
  });
});
