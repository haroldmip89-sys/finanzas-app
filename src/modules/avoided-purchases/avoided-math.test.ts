import { describe, expect, it } from "vitest";

import { comparisonRanges, groupByCategory, summarize } from "./avoided-math";

const item = (
  status: "avoided" | "postponed",
  amountCents: number,
  categoryId: string | null = null,
  categoryName: string | null = null,
) => ({ status, amountCents, categoryId, categoryName });

describe("summarize", () => {
  it("is all zero without purchases", () => {
    expect(summarize([])).toEqual({ avoidedCount: 0, avoidedCents: 0, postponedCount: 0, postponedCents: 0 });
  });

  it("adds avoided and postponed apart", () => {
    const totals = summarize([item("avoided", 1000), item("avoided", 2500), item("postponed", 4000)]);

    expect(totals).toEqual({ avoidedCount: 2, avoidedCents: 3500, postponedCount: 1, postponedCents: 4000 });
  });
});

describe("groupByCategory", () => {
  it("groups avoided purchases, biggest first, ignoring postponed ones", () => {
    const result = groupByCategory([
      item("avoided", 1000, "c1", "Comida"),
      item("avoided", 5000, "c2", "Ropa"),
      item("avoided", 2500, "c1", "Comida"),
      item("postponed", 99999, "c3", "Tecnología"),
    ]);

    expect(result).toEqual([
      { categoryId: "c2", name: "Ropa", count: 1, cents: 5000 },
      { categoryId: "c1", name: "Comida", count: 2, cents: 3500 },
    ]);
  });

  it("puts purchases without a category together as Sin categoría", () => {
    const result = groupByCategory([item("avoided", 700), item("avoided", 300)]);

    expect(result).toEqual([{ categoryId: null, name: "Sin categoría", count: 2, cents: 1000 }]);
  });

  it("breaks ties by name", () => {
    const result = groupByCategory([
      item("avoided", 100, "b", "Zeta"),
      item("avoided", 100, "a", "Alfa"),
    ]);

    expect(result.map((r) => r.name)).toEqual(["Alfa", "Zeta"]);
  });

  it("is empty when nothing was avoided", () => {
    expect(groupByCategory([item("postponed", 100)])).toEqual([]);
  });
});

describe("comparisonRanges", () => {
  const NOW = new Date("2026-11-15T15:00:00Z"); // 15 Nov in Lima

  it("compares the current month up to today with the same days of the month before", () => {
    const { current, previous } = comparisonRanges("2026-11", NOW);

    expect(current).toEqual({ from: "2026-11-01", to: "2026-11-15" });
    expect(previous).toEqual({ from: "2026-10-01", to: "2026-10-15" });
  });

  it("compares a past month in full", () => {
    const { current, previous } = comparisonRanges("2026-10", NOW);

    expect(current).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(previous).toEqual({ from: "2026-09-01", to: "2026-09-30" });
  });

  it("cuts the month before at its last day when it is shorter", () => {
    const { previous } = comparisonRanges("2027-03", new Date("2027-03-31T15:00:00Z"));

    expect(previous).toEqual({ from: "2027-02-01", to: "2027-02-28" });
  });

  it("crosses the year", () => {
    const { previous } = comparisonRanges("2027-01", new Date("2027-01-10T15:00:00Z"));

    expect(previous).toEqual({ from: "2026-12-01", to: "2026-12-10" });
  });
});
