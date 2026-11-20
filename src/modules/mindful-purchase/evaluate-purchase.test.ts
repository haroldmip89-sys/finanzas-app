import { describe, expect, it } from "vitest";

import {
  describeAffordabilityFact,
  describeBudgetFact,
  evaluatePurchase,
} from "./evaluate-purchase";

const FOOD = "11111111-1111-4111-8111-111111111111";
const FUN = "22222222-2222-4222-8222-222222222222";

const base = {
  amountCents: 8990,
  categoryId: null,
  categoryName: null,
  availableCents: 100000,
  budgets: [] as { categoryId: string; amountCents: number; spentCents: number }[],
};

describe("evaluatePurchase: budget fact", () => {
  it("says what would be left in the category budget", () => {
    const facts = evaluatePurchase({
      ...base,
      categoryId: FOOD,
      categoryName: "Comida",
      budgets: [{ categoryId: FOOD, amountCents: 20000, spentCents: 5000 }],
    });

    expect(facts.budget).toEqual({ kind: "within", categoryName: "Comida", remainingAfterCents: 6010 });
  });

  it("says by how much the budget would be exceeded", () => {
    const facts = evaluatePurchase({
      ...base,
      amountCents: 5000,
      categoryId: FOOD,
      categoryName: "Comida",
      budgets: [{ categoryId: FOOD, amountCents: 10000, spentCents: 8000 }],
    });

    expect(facts.budget).toEqual({ kind: "over", categoryName: "Comida", overCents: 3000 });
  });

  it("is exactly within when it uses the whole remainder", () => {
    const facts = evaluatePurchase({
      ...base,
      amountCents: 2000,
      categoryId: FOOD,
      categoryName: "Comida",
      budgets: [{ categoryId: FOOD, amountCents: 10000, spentCents: 8000 }],
    });

    expect(facts.budget).toMatchObject({ kind: "within", remainingAfterCents: 0 });
  });

  it("has no budget fact without a category, without a budget for it, or while budgets load", () => {
    const budgets = [{ categoryId: FUN, amountCents: 10000, spentCents: 0 }];

    expect(evaluatePurchase({ ...base, budgets }).budget).toBeNull();
    expect(evaluatePurchase({ ...base, categoryId: FOOD, categoryName: "Comida", budgets }).budget).toBeNull();
    expect(evaluatePurchase({ ...base, categoryId: FOOD, categoryName: "Comida", budgets: null }).budget).toBeNull();
  });
});

describe("evaluatePurchase: affordability fact", () => {
  it("compares with the available money when there are no budgets", () => {
    const facts = evaluatePurchase(base);

    expect(facts.affordability).toEqual({ basis: "available", kind: "within", cents: 91010 });
  });

  it("compares with the unassigned money when there are budgets", () => {
    // 100,000 available - 25,000 still held by the budget = 75,000 unassigned.
    const facts = evaluatePurchase({
      ...base,
      budgets: [{ categoryId: FOOD, amountCents: 30000, spentCents: 5000 }],
    });

    expect(facts.affordability).toEqual({ basis: "unassigned", kind: "within", cents: 66010 });
  });

  it("says by how much it exceeds the unassigned money", () => {
    const facts = evaluatePurchase({
      ...base,
      amountCents: 80000,
      budgets: [{ categoryId: FOOD, amountCents: 30000, spentCents: 5000 }],
    });

    expect(facts.affordability).toEqual({ basis: "unassigned", kind: "over", cents: 5000 });
  });

  it("is over when the available money is already negative", () => {
    const facts = evaluatePurchase({ ...base, availableCents: -17000 });

    expect(facts.affordability).toEqual({ basis: "available", kind: "over", cents: 25990 });
  });

  it("is exactly within when it uses all the money", () => {
    const facts = evaluatePurchase({ ...base, amountCents: 100000 });

    expect(facts.affordability).toMatchObject({ kind: "within", cents: 0 });
  });

  it("is unknown while the available money or the budgets are not known", () => {
    expect(evaluatePurchase({ ...base, availableCents: null }).affordability).toBeNull();
    expect(evaluatePurchase({ ...base, budgets: null }).affordability).toBeNull();
  });
});

describe("wording", () => {
  it("states facts without orders or blame", () => {
    const texts = [
      describeBudgetFact({ kind: "within", categoryName: "Ropa", remainingAfterCents: 4000 }),
      describeBudgetFact({ kind: "over", categoryName: "Ropa", overCents: 2500 }),
      describeAffordabilityFact({ basis: "unassigned", kind: "within", cents: 31000 }),
      describeAffordabilityFact({ basis: "available", kind: "over", cents: 9000 }),
    ];

    expect(texts[0]).toMatch(/Te quedarían S\/\s40\.00 en Ropa/);
    expect(texts[1]).toMatch(/Te pasarías S\/\s25\.00 de tu presupuesto de Ropa/);
    expect(texts[2]).toMatch(/Te quedarían S\/\s310\.00 sin asignar \(estimado\)/);
    expect(texts[3]).toMatch(/Supera tu dinero disponibles? en S\/\s90\.00 \(estimado\)/);
    for (const text of texts) expect(text).not.toMatch(/no deber|debes|evita|cuidado|mal/i);
  });
});
