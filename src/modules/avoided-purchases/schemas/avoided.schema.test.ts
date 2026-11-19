import { describe, expect, it } from "vitest";

import {
  avoidedFormSchema,
  avoidedInputSchema,
  avoidedMonthSchema,
  toAvoidedInput,
} from "./avoided.schema";

const CATEGORY = "11111111-1111-4111-8111-111111111111";
const base = { amountCents: 8990, date: "2026-11-15" };

describe("avoidedInputSchema", () => {
  it("only needs the amount and the date, with sensible defaults", () => {
    const parsed = avoidedInputSchema.parse(base);

    expect(parsed).toEqual({
      amountCents: 8990,
      date: "2026-11-15",
      categoryId: null,
      reason: null,
      note: null,
      status: "avoided",
    });
  });

  it("accepts every optional field", () => {
    const parsed = avoidedInputSchema.parse({
      ...base,
      categoryId: CATEGORY,
      reason: "can_wait",
      note: "  Zapatillas  ",
      status: "postponed",
    });

    expect(parsed).toMatchObject({ categoryId: CATEGORY, reason: "can_wait", note: "Zapatillas", status: "postponed" });
  });

  it("turns an empty note into null", () => {
    expect(avoidedInputSchema.parse({ ...base, note: "   " }).note).toBeNull();
  });

  it.each([
    ["zero amount", { ...base, amountCents: 0 }],
    ["negative amount", { ...base, amountCents: -5 }],
    ["decimal amount", { ...base, amountCents: 10.5 }],
    ["huge amount", { ...base, amountCents: 1e15 }],
    ["bad date", { ...base, date: "2026-02-30" }],
    ["old date", { ...base, date: "1999-12-31" }],
    ["bad category", { ...base, categoryId: "no" }],
    ["bad reason", { ...base, reason: "porque si" }],
    ["bad status", { ...base, status: "bought" }],
    ["long note", { ...base, note: "x".repeat(121) }],
  ])("rejects %s", (_label, input) => {
    expect(avoidedInputSchema.safeParse(input).success).toBe(false);
  });

  it("accepts a note of exactly 120 characters", () => {
    expect(avoidedInputSchema.safeParse({ ...base, note: "x".repeat(120) }).success).toBe(true);
  });
});

describe("avoidedMonthSchema", () => {
  it("accepts YYYY-MM only", () => {
    expect(avoidedMonthSchema.safeParse("2026-11").success).toBe(true);
    expect(avoidedMonthSchema.safeParse("2026-13").success).toBe(false);
    expect(avoidedMonthSchema.safeParse("nov").success).toBe(false);
  });
});

describe("avoidedFormSchema and toAvoidedInput", () => {
  const form = {
    amount: "89.90",
    date: "2026-11-15",
    categoryId: "",
    reason: "" as const,
    note: "",
    status: "avoided" as const,
  };

  it("validates the typed amount", () => {
    expect(avoidedFormSchema.safeParse(form).success).toBe(true);
    expect(avoidedFormSchema.safeParse({ ...form, amount: "" }).success).toBe(false);
    expect(avoidedFormSchema.safeParse({ ...form, amount: "0" }).success).toBe(false);
  });

  it("converts to cents and turns empty choices into null", () => {
    expect(toAvoidedInput(form)).toEqual({
      amountCents: 8990,
      date: "2026-11-15",
      categoryId: null,
      reason: null,
      note: null,
      status: "avoided",
    });
  });

  it("keeps the chosen category, reason and note", () => {
    const input = toAvoidedInput({ ...form, categoryId: CATEGORY, reason: "not_needed", note: "Audífonos", status: "postponed" });

    expect(input).toMatchObject({ categoryId: CATEGORY, reason: "not_needed", note: "Audífonos", status: "postponed" });
  });
});
