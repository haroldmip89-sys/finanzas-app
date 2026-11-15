import { describe, expect, it } from "vitest";

import { comparableRanges, groupTopCategories } from "./dashboard-math";

describe("comparableRanges", () => {
  it("compares this month up to today with last month up to the same day", () => {
    // 15 Nov 2026 in Lima.
    const { current, previous } = comparableRanges(new Date("2026-11-15T15:00:00Z"));

    expect(current).toEqual({ from: "2026-11-01", to: "2026-11-15" });
    expect(previous).toEqual({ from: "2026-10-01", to: "2026-10-15" });
  });

  it("stops at the last day when the previous month is shorter", () => {
    // 31 Mar -> February has 28 days.
    const { previous } = comparableRanges(new Date("2027-03-31T15:00:00Z"));

    expect(previous).toEqual({ from: "2027-02-01", to: "2027-02-28" });
  });

  it("handles a leap February and the year boundary", () => {
    expect(comparableRanges(new Date("2028-03-30T15:00:00Z")).previous.to).toBe("2028-02-29");
    const jan = comparableRanges(new Date("2027-01-10T15:00:00Z"));
    expect(jan.previous).toEqual({ from: "2026-12-01", to: "2026-12-10" });
  });

  it("uses the Lima day, not the UTC one", () => {
    // 02:00 UTC on 1 Dec is still 30 Nov in Lima.
    const { current } = comparableRanges(new Date("2026-12-01T02:00:00Z"));

    expect(current).toEqual({ from: "2026-11-01", to: "2026-11-30" });
  });
});

describe("groupTopCategories", () => {
  const item = (name: string, cents: number) => ({ name, cents });

  it("is empty without spending", () => {
    expect(groupTopCategories([])).toEqual([]);
    expect(groupTopCategories([item("A", 0)])).toEqual([]);
  });

  it("shows every category when there are five or fewer", () => {
    const result = groupTopCategories([
      item("A", 100),
      item("B", 500),
      item("C", 300),
      item("D", 50),
      item("E", 50),
    ]);

    expect(result.map((r) => r.name)).toEqual(["B", "C", "A", "D", "E"]);
    expect(result.some((r) => r.isOther)).toBe(false);
  });

  it("groups the rest as Otros past five categories, keeping the exact total", () => {
    const items = [
      item("A", 600),
      item("B", 500),
      item("C", 400),
      item("D", 300),
      item("E", 200),
      item("F", 100),
    ];

    const result = groupTopCategories(items);

    expect(result.map((r) => r.name)).toEqual(["A", "B", "C", "D", "Otros"]);
    expect(result[4]).toMatchObject({ cents: 300, isOther: true });
    expect(result.reduce((s, r) => s + r.cents, 0)).toBe(2100);
    expect(result.reduce((s, r) => s + r.pct, 0)).toBeCloseTo(100, 6);
  });

  it("breaks ties by name", () => {
    const result = groupTopCategories([item("Zeta", 100), item("Alfa", 100)]);

    expect(result.map((r) => r.name)).toEqual(["Alfa", "Zeta"]);
  });

  it("ignores categories without spending", () => {
    const result = groupTopCategories([item("A", 100), item("B", 0)]);

    expect(result.map((r) => r.name)).toEqual(["A"]);
    expect(result[0].pct).toBe(100);
  });
});
