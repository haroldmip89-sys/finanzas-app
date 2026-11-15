import { describe, expect, it } from "vitest";

import { computeAvailableMoney } from "./available-money";

type Input = Parameters<typeof computeAvailableMoney>[0][number];

const account = (overrides: Partial<Input> = {}): Input => ({
  type: "bank",
  balanceCents: 0,
  archivedAt: null,
  includeInAvailable: true,
  ...overrides,
});

// 15 Nov 2026, 10:00 in Lima.
const NOW = new Date("2026-11-15T15:00:00Z");

describe("computeAvailableMoney", () => {
  it("is the liquid money when there are no cards or reserves", () => {
    const result = computeAvailableMoney(
      [account({ balanceCents: 100000 }), account({ type: "cash", balanceCents: 5000 })],
      NOW,
    );

    expect(result).toMatchObject({
      liquidCents: 105000,
      reservedCents: 0,
      cardDebtCents: 0,
      availableCents: 105000,
    });
  });

  it("does not count reserved accounts but reports them", () => {
    const result = computeAvailableMoney(
      [
        account({ balanceCents: 100000 }),
        account({ balanceCents: 50000, includeInAvailable: false }),
        account({ type: "card", balanceCents: -20000 }),
      ],
      NOW,
    );

    expect(result.liquidCents).toBe(150000);
    expect(result.reservedCents).toBe(50000);
    expect(result.cardDebtCents).toBe(20000);
    expect(result.availableCents).toBe(80000);
  });

  it("does not let a card with credit in its favor offset another card", () => {
    const result = computeAvailableMoney(
      [
        account({ balanceCents: 100000 }),
        account({ type: "card", balanceCents: -30000 }),
        account({ type: "card", balanceCents: 4500 }),
      ],
      NOW,
    );

    expect(result.cardDebtCents).toBe(30000);
    expect(result.availableCents).toBe(70000);
  });

  it("ignores archived accounts, included or not", () => {
    const result = computeAvailableMoney(
      [
        account({ balanceCents: 100000 }),
        account({ balanceCents: 90000, archivedAt: new Date() }),
        account({ balanceCents: 70000, archivedAt: new Date(), includeInAvailable: false }),
        account({ type: "card", balanceCents: -50000, archivedAt: new Date() }),
      ],
      NOW,
    );

    expect(result).toMatchObject({ liquidCents: 100000, reservedCents: 0, cardDebtCents: 0 });
  });

  it("can be negative and then has no per-day figure", () => {
    const result = computeAvailableMoney(
      [account({ balanceCents: 10000 }), account({ type: "card", balanceCents: -25000 })],
      NOW,
    );

    expect(result.availableCents).toBe(-15000);
    expect(result.perDayCents).toBeNull();
  });

  it("is zero without accounts and has no per-day figure", () => {
    const result = computeAvailableMoney([], NOW);

    expect(result.availableCents).toBe(0);
    expect(result.perDayCents).toBeNull();
  });

  it("spreads the money over the days left, today included, rounding down", () => {
    // 15 to 30 November = 16 days.
    const result = computeAvailableMoney([account({ balanceCents: 166070 })], NOW);

    expect(result.periodEnd).toBe("2026-11-30");
    expect(result.daysLeft).toBe(16);
    expect(result.perDayCents).toBe(10379);
  });

  it("counts one day on the last day of the month", () => {
    const result = computeAvailableMoney(
      [account({ balanceCents: 5000 })],
      new Date("2026-11-30T15:00:00Z"),
    );

    expect(result.daysLeft).toBe(1);
    expect(result.perDayCents).toBe(5000);
  });

  it.each([
    ["2027-02-10T15:00:00Z", "2027-02-28", 19],
    ["2028-02-10T15:00:00Z", "2028-02-29", 20],
    ["2026-12-01T15:00:00Z", "2026-12-31", 31],
    ["2026-04-01T15:00:00Z", "2026-04-30", 30],
  ])("handles the month length on %s", (iso, end, days) => {
    const result = computeAvailableMoney([account({ balanceCents: 100 })], new Date(iso));

    expect(result.periodEnd).toBe(end);
    expect(result.daysLeft).toBe(days);
  });

  it("uses the Lima day, not the UTC one", () => {
    // 01:00 UTC on 1 Dec is still 30 Nov 20:00 in Lima.
    const result = computeAvailableMoney(
      [account({ balanceCents: 5000 })],
      new Date("2026-12-01T01:00:00Z"),
    );

    expect(result.periodEnd).toBe("2026-11-30");
    expect(result.daysLeft).toBe(1);
  });
});
