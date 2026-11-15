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
