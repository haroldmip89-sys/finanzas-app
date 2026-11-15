export type CalibrationResult = {
  transactionId: string;
  accountName: string;
  previousBalanceCents: number;
  newBalanceCents: number;
  /** Real balance minus the balance the app had (positive = income adjustment). */
  differenceCents: number;
};

export type CalibrationPreview =
  | { kind: "none" }
  | { kind: "same" }
  | { kind: "income"; amountCents: number }
  | { kind: "expense"; amountCents: number };
