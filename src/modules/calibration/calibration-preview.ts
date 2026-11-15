import { penToCents } from "@/lib/money";

import type { CalibrationPreview } from "./types/calibration.types";

/**
 * What calibrating would do: compares the balance the app has with the real
 * one the user typed. Pure, so the dialog can show it as the user types.
 */
export function getCalibrationPreview(
  currentBalanceCents: number | null,
  realBalanceText: string,
  options: { isCard?: boolean } = {},
): CalibrationPreview {
  const text = realBalanceText.trim();
  if (currentBalanceCents === null || text === "") return { kind: "none" };

  const typed = penToCents(text);
  if (typed === null) return { kind: "none" };

  // For a card the user types the debt, which is a negative balance.
  const real = options.isCard && typed !== 0 ? -typed : typed;
  const difference = real - currentBalanceCents;
  if (difference === 0) return { kind: "same" };
  return difference > 0
    ? { kind: "income", amountCents: difference }
    : { kind: "expense", amountCents: -difference };
}
