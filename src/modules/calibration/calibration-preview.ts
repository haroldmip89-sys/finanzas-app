import { penToCents } from "@/lib/money";

import type { CalibrationPreview } from "./types/calibration.types";

/**
 * What calibrating would do: compares the balance the app has with the real
 * one the user typed. Pure, so the dialog can show it as the user types.
 */
export function getCalibrationPreview(
  currentBalanceCents: number | null,
  realBalanceText: string,
): CalibrationPreview {
  const text = realBalanceText.trim();
  if (currentBalanceCents === null || text === "") return { kind: "none" };

  const real = penToCents(text);
  if (real === null) return { kind: "none" };

  const difference = real - currentBalanceCents;
  if (difference === 0) return { kind: "same" };
  return difference > 0
    ? { kind: "income", amountCents: difference }
    : { kind: "expense", amountCents: -difference };
}
