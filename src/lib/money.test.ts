import { describe, expect, it } from "vitest";

import { centsToPen, formatPen, penToCents, sanitizeMoneyInput } from "./money";

describe("penToCents", () => {
  it("parses whole numbers and 1 or 2 decimals", () => {
    expect(penToCents("12")).toBe(1200);
    expect(penToCents("12.5")).toBe(1250);
    expect(penToCents("12.05")).toBe(1205);
    expect(penToCents("0.07")).toBe(7);
    expect(penToCents("0")).toBe(0);
  });

  it("parses negatives and never returns -0", () => {
    expect(penToCents("-3.50")).toBe(-350);
    expect(penToCents("-0")).toBe(0);
    expect(Object.is(penToCents("-0"), -0)).toBe(false);
  });

  it("accepts numbers and trims spaces", () => {
    expect(penToCents(12.5)).toBe(1250);
    expect(penToCents("  8.10 ")).toBe(810);
  });

  it("avoids floating point errors", () => {
    expect(penToCents("19.99")).toBe(1999);
    expect(penToCents("0.1")).toBe(10);
  });

  it("rejects invalid input", () => {
    for (const bad of ["", "abc", "1.234", "1,50", "12.", ".5", "--1", "1e3", "S/ 10"]) {
      expect(penToCents(bad)).toBeNull();
    }
  });

  it("rejects amounts beyond the safe integer range", () => {
    expect(penToCents("99999999999999999999")).toBeNull();
  });
});

describe("centsToPen", () => {
  it("formats cents as an input value", () => {
    expect(centsToPen(1250)).toBe("12.50");
    expect(centsToPen(7)).toBe("0.07");
    expect(centsToPen(0)).toBe("0.00");
    expect(centsToPen(-350)).toBe("-3.50");
  });

  it("round-trips with penToCents", () => {
    for (const cents of [0, 1, 99, 100, 123456, -5000]) {
      expect(penToCents(centsToPen(cents))).toBe(cents);
    }
  });
});

describe("formatPen", () => {
  it("formats as soles", () => {
    const text = formatPen(123456).replace(/ /g, " ");

    expect(text).toBe("S/ 1,234.56");
  });

  it("formats zero and negatives", () => {
    expect(formatPen(0).replace(/ /g, " ")).toBe("S/ 0.00");
    expect(formatPen(-350).replace(/ /g, " ")).toMatch(/-S\/ 3\.50|S\/ -3\.50/);
  });
});

describe("sanitizeMoneyInput", () => {
  it("keeps digits and at most 2 decimals", () => {
    expect(sanitizeMoneyInput("12.345")).toBe("12.34");
    expect(sanitizeMoneyInput("1234")).toBe("1234");
    expect(sanitizeMoneyInput("12.5")).toBe("12.5");
  });

  it("removes letters and symbols", () => {
    expect(sanitizeMoneyInput("S/ 1a2b")).toBe("12");
    expect(sanitizeMoneyInput("abc")).toBe("");
  });

  it("allows a single decimal point and converts a comma", () => {
    expect(sanitizeMoneyInput("1.2.3")).toBe("1.23");
    expect(sanitizeMoneyInput("12,5")).toBe("12.5");
  });

  it("turns a leading point into 0.", () => {
    expect(sanitizeMoneyInput(".5")).toBe("0.5");
    expect(sanitizeMoneyInput(".")).toBe("0.");
  });

  it("keeps a trailing point while typing", () => {
    expect(sanitizeMoneyInput("12.")).toBe("12.");
  });

  it("only keeps a leading minus when negatives are allowed", () => {
    expect(sanitizeMoneyInput("-5.5")).toBe("5.5");
    expect(sanitizeMoneyInput("-5.5", { allowNegative: true })).toBe("-5.5");
    expect(sanitizeMoneyInput("5-5", { allowNegative: true })).toBe("55");
    expect(sanitizeMoneyInput("-", { allowNegative: true })).toBe("-");
  });

  it("produces values that penToCents accepts", () => {
    expect(penToCents(sanitizeMoneyInput("S/ 19,999"))).toBe(1999);
  });
});
