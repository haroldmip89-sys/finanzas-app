import { describe, expect, it } from "vitest";

import { evaluateMindfulPurchase, revisitAtFor, shouldAsk } from "./mindful-purchase";

const NOW = new Date("2026-11-15T15:00:00Z");

const base = {
  enabled: true,
  thresholdCents: 10000,
  type: "expense" as const,
  isEditing: false,
  amountCents: 10000,
};

describe("shouldAsk", () => {
  it("asks at the threshold and above, not below", () => {
    expect(shouldAsk(base)).toBe(true);
    expect(shouldAsk({ ...base, amountCents: 99999 })).toBe(true);
    expect(shouldAsk({ ...base, amountCents: 9999 })).toBe(false);
  });

  it("never asks for income, edits, adjustments, zero or when disabled", () => {
    expect(shouldAsk({ ...base, type: "income" })).toBe(false);
    expect(shouldAsk({ ...base, isEditing: true })).toBe(false);
    expect(shouldAsk({ ...base, isSystemCategory: true })).toBe(false);
    expect(shouldAsk({ ...base, amountCents: 0, thresholdCents: 0 })).toBe(false);
    expect(shouldAsk({ ...base, enabled: false })).toBe(false);
  });
});

const account = (over: Record<string, unknown>) => ({
  id: "a1",
  type: "bank" as const,
  balanceCents: 100000,
  archivedAt: null,
  includeInAvailable: true,
  ...over,
});

describe("evaluateMindfulPurchase", () => {
  it("lowers the available money by the amount", () => {
    const { available } = evaluateMindfulPurchase({
      amountCents: 25000,
      accountId: "a1",
      accounts: [account({})],
      budget: null,
      now: NOW,
    });
    expect(available.beforeCents).toBe(100000);
    expect(available.afterCents).toBe(75000);
    expect(available.affectsAvailable).toBe(true);
    // 15 Nov: 16 days left (15..30).
    expect(available.perDayAfterCents).toBe(Math.floor(75000 / 16));
  });

  it("does not change the available money when it comes from a reserve", () => {
    const { available } = evaluateMindfulPurchase({
      amountCents: 25000,
      accountId: "r1",
      accounts: [account({}), account({ id: "r1", balanceCents: 50000, includeInAvailable: false })],
      budget: null,
      now: NOW,
    });
    expect(available.affectsAvailable).toBe(false);
    expect(available.afterCents).toBe(available.beforeCents);
  });

  it("counts a card purchase as more debt", () => {
    const { available } = evaluateMindfulPurchase({
      amountCents: 30000,
      accountId: "c1",
      accounts: [account({}), account({ id: "c1", type: "card", balanceCents: -10000 })],
      budget: null,
      now: NOW,
    });
    expect(available.beforeCents).toBe(90000);
    expect(available.afterCents).toBe(60000);
  });

  it("goes negative with no per-day figure", () => {
    const { available } = evaluateMindfulPurchase({
      amountCents: 150000,
      accountId: "a1",
      accounts: [account({})],
      budget: null,
      now: NOW,
    });
    expect(available.afterCents).toBe(-50000);
    expect(available.perDayAfterCents).toBeNull();
  });

  it("reports the budget before and after, and the excess", () => {
    const within = evaluateMindfulPurchase({
      amountCents: 10000,
      accountId: "a1",
      accounts: [account({})],
      budget: { amountCents: 30000, spentCents: 12000 },
      now: NOW,
    });
    expect(within.budget).toEqual({
      kind: "budget",
      remainingBeforeCents: 18000,
      remainingAfterCents: 8000,
      overByCents: 0,
    });

    const over = evaluateMindfulPurchase({
      amountCents: 20000,
      accountId: "a1",
      accounts: [account({})],
      budget: { amountCents: 30000, spentCents: 20000 },
      now: NOW,
    });
    expect(over.budget).toMatchObject({ remainingAfterCents: -10000, overByCents: 10000 });
  });

  it("says there is no budget", () => {
    const { budget } = evaluateMindfulPurchase({
      amountCents: 10000,
      accountId: "a1",
      accounts: [account({})],
      budget: null,
      now: NOW,
    });
    expect(budget).toEqual({ kind: "none" });
  });
});

describe("revisitAtFor", () => {
  it("adds 10 minutes or 24 hours", () => {
    expect(revisitAtFor("10m", NOW)).toBe("2026-11-15T15:10:00.000Z");
    expect(revisitAtFor("24h", NOW)).toBe("2026-11-16T15:00:00.000Z");
  });
});
