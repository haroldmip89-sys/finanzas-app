import { describe, expect, it } from "vitest";

import { planStatus } from "./installments-math";

const NOW = new Date("2026-11-15T15:00:00Z");
const plan = {
  firstDueMonth: "2026-10-01",
  installmentCount: 12,
  installmentCents: 10000,
  principalCents: 110000,
  paidCount: 1,
};

describe("planStatus", () => {
  it("computes what is left, the next month and the interest", () => {
    expect(planStatus(plan, NOW)).toEqual({
      remainingCount: 11,
      remainingCents: 110000,
      nextDueMonth: "2026-11",
      dueThisMonth: true,
      finished: false,
      interestCents: 10000,
    });
  });

  it("flags overdue installments as due this month", () => {
    expect(planStatus({ ...plan, paidCount: 0 }, NOW).dueThisMonth).toBe(true);
  });

  it("does not flag a plan that starts later", () => {
    const s = planStatus({ ...plan, firstDueMonth: "2026-12-01", paidCount: 0 }, NOW);
    expect(s.nextDueMonth).toBe("2026-12");
    expect(s.dueThisMonth).toBe(false);
  });

  it("is finished when everything is paid", () => {
    const s = planStatus({ ...plan, paidCount: 12 }, NOW);
    expect(s).toMatchObject({ finished: true, nextDueMonth: null, dueThisMonth: false, remainingCents: 0 });
  });

  it("has no interest when the installments equal the price or less", () => {
    expect(planStatus({ ...plan, principalCents: 120000 }, NOW).interestCents).toBe(0);
    expect(planStatus({ ...plan, principalCents: 150000 }, NOW).interestCents).toBe(0);
  });

  it("crosses the year when counting months", () => {
    const s = planStatus({ ...plan, firstDueMonth: "2026-11-01", paidCount: 3 }, NOW);
    expect(s.nextDueMonth).toBe("2027-02");
  });
});
