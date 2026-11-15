import { describe, expect, it } from "vitest";

import {
  toTransferInput,
  transferFiltersSchema,
  transferFormSchema,
  transferInputSchema,
} from "./transfer.schema";

const FROM = "3f1c2b4a-1b2c-4d5e-8f90-1234567890ab";
const TO = "9a8b7c6d-1b2c-4d5e-8f90-1234567890ab";

const valid = {
  fromAccountId: FROM,
  toAccountId: TO,
  amountCents: 20000,
  date: "2026-11-15",
  note: null,
};

describe("transferInputSchema", () => {
  it("accepts a valid transfer and normalizes an empty note to null", () => {
    expect(transferInputSchema.parse({ ...valid, note: "  " }).note).toBeNull();
    expect(transferInputSchema.parse({ ...valid, note: " Ahorro " }).note).toBe("Ahorro");
  });

  it("rejects the same account as origin and destination", () => {
    const result = transferInputSchema.safeParse({ ...valid, toAccountId: FROM });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["toAccountId"]);
  });

  it("rejects amounts <= 0, non-integers and out of range", () => {
    for (const amountCents of [0, -1, 2.5, 1e15]) {
      expect(transferInputSchema.safeParse({ ...valid, amountCents }).success).toBe(false);
    }
  });

  it("rejects invalid dates and long notes", () => {
    expect(transferInputSchema.safeParse({ ...valid, date: "2026-02-30" }).success).toBe(false);
    expect(transferInputSchema.safeParse({ ...valid, note: "x".repeat(281) }).success).toBe(false);
  });

  it("rejects bad ids", () => {
    expect(transferInputSchema.safeParse({ ...valid, fromAccountId: "1" }).success).toBe(false);
  });
});

describe("transferFormSchema", () => {
  const base = {
    fromAccountId: FROM,
    toAccountId: TO,
    date: "2026-11-15",
    note: "",
  };

  it("accepts PEN amounts greater than 0", () => {
    for (const amount of ["1", "100.5", "0.01"]) {
      expect(transferFormSchema.safeParse({ ...base, amount }).success).toBe(true);
    }
  });

  it("rejects empty, zero, negative and malformed amounts", () => {
    for (const amount of ["", "0", "-5", "abc", "1.234"]) {
      expect(transferFormSchema.safeParse({ ...base, amount }).success).toBe(false);
    }
  });

  it("requires both accounts and rejects equal ones", () => {
    expect(transferFormSchema.safeParse({ ...base, amount: "5", fromAccountId: "" }).success).toBe(false);
    expect(transferFormSchema.safeParse({ ...base, amount: "5", toAccountId: "" }).success).toBe(false);
    expect(transferFormSchema.safeParse({ ...base, amount: "5", toAccountId: FROM }).success).toBe(false);
  });
});

describe("toTransferInput", () => {
  it("converts the amount to cents and an empty note to null", () => {
    expect(
      toTransferInput({
        fromAccountId: FROM,
        toAccountId: TO,
        amount: "250.75",
        date: "2026-11-15",
        note: "",
      }),
    ).toEqual({
      fromAccountId: FROM,
      toAccountId: TO,
      amountCents: 25075,
      date: "2026-11-15",
      note: null,
    });
  });
});

describe("transferFiltersSchema", () => {
  it("applies defaults for page and pageSize", () => {
    const parsed = transferFiltersSchema.parse({});

    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(20);
  });

  it("rejects from > to and accepts equal dates", () => {
    expect(transferFiltersSchema.safeParse({ from: "2026-11-20", to: "2026-11-10" }).success).toBe(false);
    expect(transferFiltersSchema.safeParse({ from: "2026-11-10", to: "2026-11-10" }).success).toBe(true);
  });

  it("rejects page and pageSize out of range", () => {
    expect(transferFiltersSchema.safeParse({ page: 0 }).success).toBe(false);
    expect(transferFiltersSchema.safeParse({ pageSize: 101 }).success).toBe(false);
  });
});
