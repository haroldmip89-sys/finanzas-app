import { describe, expect, it } from "vitest";

import { weekRanges } from "./week-math";

describe("weekRanges", () => {
  it("starts on Monday and compares with the same weekday last week", () => {
    // Sunday 15 Nov 2026, 10:00 in Lima.
    expect(weekRanges(new Date("2026-11-15T15:00:00Z"))).toEqual({
      from: "2026-11-09",
      to: "2026-11-15",
      previous: { from: "2026-11-02", to: "2026-11-08" },
    });
  });

  it("is a single day on Monday", () => {
    // Monday 16 Nov 2026.
    expect(weekRanges(new Date("2026-11-16T15:00:00Z"))).toEqual({
      from: "2026-11-16",
      to: "2026-11-16",
      previous: { from: "2026-11-09", to: "2026-11-09" },
    });
  });

  it("uses the Lima day, not the UTC one", () => {
    // 02:00 UTC on Monday 16 Nov is still Sunday 15 in Lima.
    expect(weekRanges(new Date("2026-11-16T02:00:00Z")).from).toBe("2026-11-09");
  });

  it("crosses months and years", () => {
    // Wednesday 2 Dec 2026 -> Monday 30 Nov.
    expect(weekRanges(new Date("2026-12-02T15:00:00Z")).from).toBe("2026-11-30");
    // Friday 1 Jan 2027 -> Monday 28 Dec 2026.
    const w = weekRanges(new Date("2027-01-01T15:00:00Z"));
    expect(w.from).toBe("2026-12-28");
    expect(w.previous).toEqual({ from: "2026-12-21", to: "2026-12-25" });
  });
});
