import { describe, expect, it } from "vitest";

import {
  addDays,
  addMonths,
  currentMonthKey,
  formatMonth,
  isValidMonthKey,
  monthKeyRange,
  currentMonthRange,
  previousMonthRange,
  formatDate,
  isValidDateString,
  todayInLima,
} from "./dates";

describe("todayInLima", () => {
  it("uses the Lima calendar day, not UTC", () => {
    // 03:00 UTC on the 16th is still 22:00 on the 15th in Lima (UTC-5).
    expect(todayInLima(new Date("2026-11-16T03:00:00Z"))).toBe("2026-11-15");
  });

  it("matches UTC when both are on the same day", () => {
    expect(todayInLima(new Date("2026-11-15T15:00:00Z"))).toBe("2026-11-15");
  });

  it("moves to the next day at 05:00 UTC", () => {
    expect(todayInLima(new Date("2026-11-16T05:00:00Z"))).toBe("2026-11-16");
  });
});

describe("currentMonthRange", () => {
  it("returns the first and last day of the month in Lima", () => {
    expect(currentMonthRange(new Date("2026-11-15T15:00:00Z"))).toEqual({
      from: "2026-11-01",
      to: "2026-11-30",
    });
  });

  it("handles February in a leap year", () => {
    expect(currentMonthRange(new Date("2028-02-10T15:00:00Z"))).toEqual({
      from: "2028-02-01",
      to: "2028-02-29",
    });
  });

  it("uses the Lima month near the month boundary", () => {
    // 02:00 UTC on Dec 1st is still Nov 30th in Lima.
    expect(currentMonthRange(new Date("2026-12-01T02:00:00Z"))).toEqual({
      from: "2026-11-01",
      to: "2026-11-30",
    });
  });
});

describe("isValidDateString", () => {
  it("accepts real days, including Feb 29 on leap years", () => {
    expect(isValidDateString("2026-11-15")).toBe(true);
    expect(isValidDateString("2028-02-29")).toBe(true);
  });

  it("rejects non-existent days and bad formats", () => {
    for (const bad of ["2026-02-29", "2026-13-01", "2026-00-10", "2026-04-31", "2026-1-5", "15/11/2026", "", "abc"]) {
      expect(isValidDateString(bad)).toBe(false);
    }
  });
});

describe("formatDate", () => {
  it("formats as day, short month and year", () => {
    expect(formatDate("2026-11-15")).toBe("15 nov 2026");
    expect(formatDate("2026-01-05")).toBe("5 ene 2026");
  });

  it("returns the input when it is not a valid date", () => {
    expect(formatDate("nope")).toBe("nope");
  });
});

describe("addDays", () => {
  it("goes back and forward", () => {
    expect(addDays("2026-11-15", -1)).toBe("2026-11-14");
    expect(addDays("2026-11-15", 1)).toBe("2026-11-16");
    expect(addDays("2026-11-15", 0)).toBe("2026-11-15");
  });

  it("crosses month and year boundaries", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("handles leap years", () => {
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
    expect(addDays("2027-03-01", -1)).toBe("2027-02-28");
  });

  it("subtracts 90 days", () => {
    expect(addDays("2026-11-15", -90)).toBe("2026-08-17");
  });
});

describe("previousMonthRange", () => {
  it("returns the month before the current one in Lima", () => {
    expect(previousMonthRange(new Date("2026-11-15T15:00:00Z"))).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
    });
  });

  it("crosses the year boundary", () => {
    expect(previousMonthRange(new Date("2027-01-10T15:00:00Z"))).toEqual({
      from: "2026-12-01",
      to: "2026-12-31",
    });
  });

  it("handles February of a leap year and of a normal year", () => {
    expect(previousMonthRange(new Date("2028-03-10T15:00:00Z")).to).toBe("2028-02-29");
    expect(previousMonthRange(new Date("2027-03-10T15:00:00Z")).to).toBe("2027-02-28");
  });

  it("uses the Lima month near the month boundary", () => {
    // 02:00 UTC on Dec 1st is still Nov 30th in Lima, so "previous" is October.
    expect(previousMonthRange(new Date("2026-12-01T02:00:00Z"))).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
    });
  });
});

describe("month keys", () => {
  it("currentMonthKey uses the Lima month, not UTC", () => {
    expect(currentMonthKey(new Date("2026-11-15T15:00:00Z"))).toBe("2026-11");
    // 02:00 UTC on Dec 1st is still Nov 30th in Lima.
    expect(currentMonthKey(new Date("2026-12-01T02:00:00Z"))).toBe("2026-11");
    expect(currentMonthKey(new Date("2026-12-01T06:00:00Z"))).toBe("2026-12");
  });

  it("addMonths moves forward and back across years", () => {
    expect(addMonths("2026-11", 1)).toBe("2026-12");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-03", -14)).toBe("2025-01");
    expect(addMonths("2026-11", 0)).toBe("2026-11");
    expect(addMonths("2026-11", 25)).toBe("2028-12");
  });

  it("monthKeyRange returns the first and last day, including leap Februaries", () => {
    expect(monthKeyRange("2026-11")).toEqual({ from: "2026-11-01", to: "2026-11-30" });
    expect(monthKeyRange("2026-12")).toEqual({ from: "2026-12-01", to: "2026-12-31" });
    expect(monthKeyRange("2028-02").to).toBe("2028-02-29");
    expect(monthKeyRange("2027-02").to).toBe("2027-02-28");
  });

  it("formatMonth writes the month name in Spanish", () => {
    expect(formatMonth("2026-11")).toBe("noviembre 2026");
    expect(formatMonth("2027-01")).toBe("enero 2027");
    expect(formatMonth("nope")).toBe("nope");
  });

  it("isValidMonthKey accepts only YYYY-MM with a real month", () => {
    expect(isValidMonthKey("2026-11")).toBe(true);
    for (const bad of ["2026-13", "2026-00", "2026-1", "26-11", "2026-11-01", "", "abc"]) {
      expect(isValidMonthKey(bad)).toBe(false);
    }
  });
});
