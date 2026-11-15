import { describe, expect, it } from "vitest";

import {
  toTransactionInput,
  transactionFiltersSchema,
  transactionFormSchema,
  transactionInputSchema,
} from "./transaction.schema";

const ACCOUNT = "3f1c2b4a-1b2c-4d5e-8f90-1234567890ab";
const CATEGORY = "9a8b7c6d-1b2c-4d5e-8f90-1234567890ab";

const valid = {
  type: "expense" as const,
  accountId: ACCOUNT,
  categoryId: CATEGORY,
  amountCents: 1250,
  date: "2026-11-15",
  note: null,
};

describe("transactionInputSchema", () => {
  it("accepts a valid transaction and normalizes an empty note to null", () => {
    expect(transactionInputSchema.parse({ ...valid, note: "   " }).note).toBeNull();
    expect(transactionInputSchema.parse({ ...valid, note: " Almuerzo " }).note).toBe("Almuerzo");
    expect(transactionInputSchema.parse({ ...valid, note: undefined }).note).toBeNull();
  });

  it("rejects amounts <= 0, non-integers and out of range", () => {
    for (const amountCents of [0, -5, 1.5, 1e15]) {
      expect(transactionInputSchema.safeParse({ ...valid, amountCents }).success).toBe(false);
    }
  });

  it("rejects invalid dates", () => {
    for (const date of ["2026-02-30", "15/11/2026", "1999-12-31", ""]) {
      expect(transactionInputSchema.safeParse({ ...valid, date }).success).toBe(false);
    }
  });

  it("allows future dates", () => {
    expect(transactionInputSchema.safeParse({ ...valid, date: "2099-01-01" }).success).toBe(true);
  });

  it("rejects a note over 280 characters", () => {
    expect(transactionInputSchema.safeParse({ ...valid, note: "x".repeat(281) }).success).toBe(false);
    expect(transactionInputSchema.safeParse({ ...valid, note: "x".repeat(280) }).success).toBe(true);
  });

  it("rejects bad ids and types", () => {
    expect(transactionInputSchema.safeParse({ ...valid, accountId: "1" }).success).toBe(false);
    expect(transactionInputSchema.safeParse({ ...valid, type: "transfer" }).success).toBe(false);
  });
});

describe("transactionFormSchema", () => {
  const base = {
    type: "expense" as const,
    accountId: ACCOUNT,
    categoryId: CATEGORY,
    date: "2026-11-15",
    note: "",
  };

  it("accepts PEN amounts greater than 0", () => {
    for (const amount of ["1", "25.5", "0.01"]) {
      expect(transactionFormSchema.safeParse({ ...base, amount }).success).toBe(true);
    }
  });

  it("rejects empty, zero, negative and malformed amounts", () => {
    for (const amount of ["", "0", "0.00", "-5", "abc", "1.234"]) {
      expect(transactionFormSchema.safeParse({ ...base, amount }).success).toBe(false);
    }
  });

  it("requires an account and a category", () => {
    expect(transactionFormSchema.safeParse({ ...base, amount: "5", accountId: "" }).success).toBe(false);
    expect(transactionFormSchema.safeParse({ ...base, amount: "5", categoryId: "" }).success).toBe(false);
  });
});

describe("toTransactionInput", () => {
  it("converts the amount to cents and an empty note to null", () => {
    expect(
      toTransactionInput({
        type: "income",
        accountId: ACCOUNT,
        categoryId: CATEGORY,
        amount: "1234.56",
        date: "2026-11-15",
        note: "",
      }),
    ).toEqual({
      type: "income",
      accountId: ACCOUNT,
      categoryId: CATEGORY,
      amountCents: 123456,
      date: "2026-11-15",
      note: null,
    });
  });
});

describe("transactionFiltersSchema", () => {
  it("applies defaults for page and pageSize", () => {
    const parsed = transactionFiltersSchema.parse({});

    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(20);
  });

  it("rejects from > to and accepts equal dates", () => {
    expect(
      transactionFiltersSchema.safeParse({ from: "2026-11-20", to: "2026-11-10" }).success,
    ).toBe(false);
    expect(
      transactionFiltersSchema.safeParse({ from: "2026-11-10", to: "2026-11-10" }).success,
    ).toBe(true);
  });

  it("rejects page and pageSize out of range", () => {
    expect(transactionFiltersSchema.safeParse({ page: 0 }).success).toBe(false);
    expect(transactionFiltersSchema.safeParse({ pageSize: 0 }).success).toBe(false);
    expect(transactionFiltersSchema.safeParse({ pageSize: 101 }).success).toBe(false);
  });
});
