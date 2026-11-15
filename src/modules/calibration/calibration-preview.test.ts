import { describe, expect, it } from "vitest";

import { getCalibrationPreview } from "./calibration-preview";

describe("getCalibrationPreview", () => {
  it("is none without a balance, with empty text or with an invalid amount", () => {
    expect(getCalibrationPreview(null, "10")).toEqual({ kind: "none" });
    expect(getCalibrationPreview(1000, "")).toEqual({ kind: "none" });
    expect(getCalibrationPreview(1000, "   ")).toEqual({ kind: "none" });
    expect(getCalibrationPreview(1000, "abc")).toEqual({ kind: "none" });
    expect(getCalibrationPreview(1000, "12.")).toEqual({ kind: "none" });
  });

  it("is same when the real balance equals the current one", () => {
    expect(getCalibrationPreview(82000, "820")).toEqual({ kind: "same" });
    expect(getCalibrationPreview(82000, "820.00")).toEqual({ kind: "same" });
    expect(getCalibrationPreview(0, "0")).toEqual({ kind: "same" });
    expect(getCalibrationPreview(-1500, "-15")).toEqual({ kind: "same" });
  });

  it("is an income adjustment when the real balance is higher", () => {
    expect(getCalibrationPreview(80000, "820")).toEqual({ kind: "income", amountCents: 2000 });
    expect(getCalibrationPreview(-5000, "0")).toEqual({ kind: "income", amountCents: 5000 });
  });

  it("is an expense adjustment when the real balance is lower", () => {
    expect(getCalibrationPreview(82000, "800.50")).toEqual({ kind: "expense", amountCents: 1950 });
    expect(getCalibrationPreview(0, "-10")).toEqual({ kind: "expense", amountCents: 1000 });
  });

  it("handles cents without floating point drift", () => {
    expect(getCalibrationPreview(1999, "20.00")).toEqual({ kind: "income", amountCents: 1 });
  });
});

describe("getCalibrationPreview for cards (typed value is the debt)", () => {
  const card = { isCard: true };

  it("is same when the typed debt equals the current debt", () => {
    expect(getCalibrationPreview(-35000, "350", card)).toEqual({ kind: "same" });
    expect(getCalibrationPreview(0, "0", card)).toEqual({ kind: "same" });
  });

  it("a lower real debt is an increase of the balance (income adjustment)", () => {
    expect(getCalibrationPreview(-35000, "300", card)).toEqual({ kind: "income", amountCents: 5000 });
  });

  it("a higher real debt is a decrease of the balance (expense adjustment)", () => {
    expect(getCalibrationPreview(-35000, "400", card)).toEqual({ kind: "expense", amountCents: 5000 });
    expect(getCalibrationPreview(0, "120", card)).toEqual({ kind: "expense", amountCents: 12000 });
  });

  it("a negative typed value is credit in favor", () => {
    expect(getCalibrationPreview(-10000, "-50", card)).toEqual({ kind: "income", amountCents: 15000 });
  });

  it("ignores the card flag for normal accounts", () => {
    expect(getCalibrationPreview(10000, "50", { isCard: false })).toEqual({ kind: "expense", amountCents: 5000 });
  });
});
