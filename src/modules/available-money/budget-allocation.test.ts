import { describe, expect, it } from "vitest";

import { computeBudgetAllocation } from "./budget-allocation";

describe("computeBudgetAllocation", () => {
  it("has no budgets and nothing pending", () => {
    expect(computeBudgetAllocation(100000, [])).toEqual({
      hasBudgets: false,
      pendingCents: 0,
      unassignedCents: 100000,
    });
  });

  it("holds the remaining part of a budget", () => {
    const result = computeBudgetAllocation(100000, [{ amountCents: 30000, spentCents: 5000 }]);

    expect(result).toEqual({ hasBudgets: true, pendingCents: 25000, unassignedCents: 75000 });
  });

  it("adds the remaining part of several budgets", () => {
    const result = computeBudgetAllocation(100000, [
      { amountCents: 30000, spentCents: 10000 },
      { amountCents: 20000, spentCents: 0 },
    ]);

    expect(result.pendingCents).toBe(40000);
    expect(result.unassignedCents).toBe(60000);
  });

  it("does not give money back for an exceeded budget", () => {
    const result = computeBudgetAllocation(100000, [
      { amountCents: 10000, spentCents: 15000 },
      { amountCents: 20000, spentCents: 5000 },
    ]);

    expect(result.pendingCents).toBe(15000);
    expect(result.unassignedCents).toBe(85000);
  });

  it("counts a fully spent budget as nothing pending", () => {
    const result = computeBudgetAllocation(50000, [{ amountCents: 10000, spentCents: 10000 }]);

    expect(result).toMatchObject({ hasBudgets: true, pendingCents: 0, unassignedCents: 50000 });
  });

  it("goes negative when the budgets hold more than is available", () => {
    const result = computeBudgetAllocation(20000, [{ amountCents: 50000, spentCents: 0 }]);

    expect(result.unassignedCents).toBe(-30000);
  });
});
