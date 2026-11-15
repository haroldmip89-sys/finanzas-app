import { describe, expect, it } from "vitest";

import { getBudgetStatus } from "./budget-status";

describe("getBudgetStatus", () => {
  it("is ok with no spending", () => {
    expect(getBudgetStatus(20000, 0)).toEqual({
      percent: 0,
      barPercent: 0,
      state: "ok",
      remainingCents: 20000,
    });
  });

  it("is ok just below 80 %", () => {
    // 15999 / 20000 = 79.995 %
    const status = getBudgetStatus(20000, 15999);
    expect(status.state).toBe("ok");
    expect(status.percent).toBe(79);
  });

  it("is near at exactly 80 %", () => {
    const status = getBudgetStatus(20000, 16000);
    expect(status.state).toBe("near");
    expect(status.percent).toBe(80);
    expect(status.remainingCents).toBe(4000);
  });

  it("is near at exactly 100 %", () => {
    const status = getBudgetStatus(20000, 20000);
    expect(status.state).toBe("near");
    expect(status.percent).toBe(100);
    expect(status.remainingCents).toBe(0);
  });

  it("is over past 100 %, with a negative remainder and a capped bar", () => {
    const status = getBudgetStatus(20000, 20001);
    expect(status.state).toBe("over");
    expect(status.percent).toBe(100);
    expect(status.barPercent).toBe(100);
    expect(status.remainingCents).toBe(-1);
  });

  it("keeps counting the percent beyond 100 while the bar stays full", () => {
    const status = getBudgetStatus(10000, 25000);
    expect(status.percent).toBe(250);
    expect(status.barPercent).toBe(100);
    expect(status.remainingCents).toBe(-15000);
  });

  it("does not drift with small amounts", () => {
    expect(getBudgetStatus(1, 0).state).toBe("ok");
    expect(getBudgetStatus(1, 1).state).toBe("near");
    expect(getBudgetStatus(1, 2).state).toBe("over");
  });
});
