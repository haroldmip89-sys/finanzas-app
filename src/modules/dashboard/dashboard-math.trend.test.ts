import { describe, expect, it } from "vitest";

import { compareTrend, cumulative, niceMax, toDailySeries } from "./dashboard-math";

describe("toDailySeries", () => {
  it("puts each day in its position and fills the empty days with 0", () => {
    const series = toDailySeries(
      [
        { date: "2026-11-01", cents: 500 },
        { date: "2026-11-04", cents: 1200 },
      ],
      "2026-11-01",
      5,
    );

    expect(series).toEqual([500, 0, 0, 1200, 0]);
  });

  it("ignores rows outside the range and handles month boundaries", () => {
    const series = toDailySeries(
      [
        { date: "2026-10-31", cents: 100 },
        { date: "2026-11-01", cents: 200 },
        { date: "2026-12-01", cents: 999 },
      ],
      "2026-10-30",
      3,
    );

    expect(series).toEqual([0, 100, 200]);
  });

  it("returns zeros for no rows", () => {
    expect(toDailySeries([], "2026-11-01", 3)).toEqual([0, 0, 0]);
  });
});

describe("cumulative", () => {
  it("accumulates and keeps flat lines on empty days", () => {
    expect(cumulative([500, 0, 0, 1200, 0])).toEqual([500, 500, 500, 1700, 1700]);
  });

  it("is empty for no days", () => {
    expect(cumulative([])).toEqual([]);
  });
});

describe("compareTrend", () => {
  it("gives totals, difference, variation and daily averages", () => {
    const result = compareTrend([1000, 0, 2000, 0], [2000, 1000, 1000, 0]);

    expect(result).toEqual({
      currentCents: 3000,
      previousCents: 4000,
      diffCents: -1000,
      pct: -25,
      currentAvgCents: 750,
      previousAvgCents: 1000,
    });
  });

  it("has no percentage when last month had no spending", () => {
    const result = compareTrend([1000, 500], [0, 0]);

    expect(result.pct).toBeNull();
    expect(result.diffCents).toBe(1500);
  });

  it("uses the real length of each period for its average", () => {
    // Last month was shorter than today's day number: 2 days against 3.
    const result = compareTrend([300, 300, 300], [500, 500]);

    expect(result.currentAvgCents).toBe(300);
    expect(result.previousAvgCents).toBe(500);
  });

  it("is all zero without data", () => {
    expect(compareTrend([], [])).toEqual({
      currentCents: 0,
      previousCents: 0,
      diffCents: 0,
      pct: null,
      currentAvgCents: 0,
      previousAvgCents: 0,
    });
  });

  it("rounds the variation to a whole percent", () => {
    expect(compareTrend([1234], [1000]).pct).toBe(23);
  });
});

describe("niceMax", () => {
  it.each([
    [0, 100],
    [-5, 100],
    [1, 1],
    [130, 200],
    [200, 200],
    [210, 250],
    [260, 500],
    [501, 1000],
    [123640, 200000],
  ])("rounds %d up to %d", (value, expected) => {
    expect(niceMax(value)).toBe(expected);
  });
});
