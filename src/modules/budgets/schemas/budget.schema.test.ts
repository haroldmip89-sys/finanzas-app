import { describe, expect, it } from "vitest";

import {
  budgetCreateSchema,
  budgetFormSchema,
  budgetUpdateSchema,
  listBudgetsSchema,
  toBudgetCreateInput,
  toBudgetUpdateInput,
} from "./budget.schema";

const CATEGORY = "3f1c2b4a-1b2c-4d5e-8f90-1234567890ab";

describe("budgetCreateSchema", () => {
  const valid = { categoryId: CATEGORY, month: "2026-11", amountCents: 20000 };

  it("accepts a valid budget", () => {
    expect(budgetCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects amounts <= 0, non-integers and out of range", () => {
    for (const amountCents of [0, -5, 1.5, 1e15]) {
      expect(budgetCreateSchema.safeParse({ ...valid, amountCents }).success).toBe(false);
    }
  });

  it("rejects malformed months", () => {
    for (const month of ["2026-13", "2026-1", "2026-11-01", "", "nov"]) {
      expect(budgetCreateSchema.safeParse({ ...valid, month }).success).toBe(false);
    }
  });

  it("rejects a bad category id", () => {
    expect(budgetCreateSchema.safeParse({ ...valid, categoryId: "1" }).success).toBe(false);
  });
});

describe("budgetUpdateSchema", () => {
  it("only carries the amount", () => {
    const parsed = budgetUpdateSchema.parse({ amountCents: 500, categoryId: CATEGORY, month: "2026-11" });

    expect(parsed).toEqual({ amountCents: 500 });
  });

  it("rejects an invalid amount", () => {
    expect(budgetUpdateSchema.safeParse({ amountCents: 0 }).success).toBe(false);
  });
});

describe("listBudgetsSchema", () => {
  it("requires a valid month", () => {
    expect(listBudgetsSchema.safeParse({ month: "2026-11" }).success).toBe(true);
    expect(listBudgetsSchema.safeParse({ month: "2026-00" }).success).toBe(false);
  });
});

describe("budgetFormSchema", () => {
  it("accepts a category and a PEN amount greater than 0", () => {
    for (const amount of ["1", "300", "250.5", "0.01"]) {
      expect(budgetFormSchema.safeParse({ categoryId: CATEGORY, amount }).success).toBe(true);
    }
  });

  it("rejects empty, zero, negative and malformed amounts", () => {
    for (const amount of ["", "0", "0.00", "-5", "abc", "1.234"]) {
      expect(budgetFormSchema.safeParse({ categoryId: CATEGORY, amount }).success).toBe(false);
    }
  });

  it("requires a category", () => {
    expect(budgetFormSchema.safeParse({ categoryId: "", amount: "100" }).success).toBe(false);
  });
});

describe("form conversions", () => {
  it("builds the create input with the month and cents", () => {
    expect(toBudgetCreateInput({ categoryId: CATEGORY, amount: "300.50" }, "2026-11")).toEqual({
      categoryId: CATEGORY,
      month: "2026-11",
      amountCents: 30050,
    });
  });

  it("builds the update input with cents only", () => {
    expect(toBudgetUpdateInput({ categoryId: CATEGORY, amount: "120" })).toEqual({
      amountCents: 12000,
    });
  });
});
