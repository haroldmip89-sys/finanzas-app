import { describe, expect, it } from "vitest";

import {
  calibrationFormSchema,
  calibrationInputSchema,
  toCalibrationInput,
} from "./calibration.schema";

const ACCOUNT = "3f1c2b4a-1b2c-4d5e-8f90-1234567890ab";

describe("calibrationInputSchema", () => {
  it("accepts positive, zero and negative integer balances", () => {
    for (const realBalanceCents of [82000, 0, -15000]) {
      expect(calibrationInputSchema.safeParse({ accountId: ACCOUNT, realBalanceCents }).success).toBe(true);
    }
  });

  it("rejects non-integers, text and out of range", () => {
    for (const realBalanceCents of [1.5, "10", 1e15, -1e15, NaN]) {
      expect(calibrationInputSchema.safeParse({ accountId: ACCOUNT, realBalanceCents }).success).toBe(false);
    }
  });

  it("rejects a bad account id", () => {
    expect(calibrationInputSchema.safeParse({ accountId: "1", realBalanceCents: 1 }).success).toBe(false);
  });
});

describe("calibrationFormSchema", () => {
  it("accepts PEN amounts with up to 2 decimals and an optional sign", () => {
    for (const realBalance of ["0", "820", "820.5", "-150.25"]) {
      expect(calibrationFormSchema.safeParse({ accountId: ACCOUNT, realBalance }).success).toBe(true);
    }
  });

  it("rejects empty and malformed amounts", () => {
    for (const realBalance of ["", "  ", "abc", "1.234", "-", "12."]) {
      expect(calibrationFormSchema.safeParse({ accountId: ACCOUNT, realBalance }).success).toBe(false);
    }
  });

  it("requires an account", () => {
    expect(calibrationFormSchema.safeParse({ accountId: "", realBalance: "5" }).success).toBe(false);
  });
});

describe("toCalibrationInput", () => {
  it("converts the amount to signed cents", () => {
    expect(toCalibrationInput({ accountId: ACCOUNT, realBalance: "820.50" })).toEqual({
      accountId: ACCOUNT,
      realBalanceCents: 82050,
    });
    expect(toCalibrationInput({ accountId: ACCOUNT, realBalance: "-150" }).realBalanceCents).toBe(-15000);
  });
});
