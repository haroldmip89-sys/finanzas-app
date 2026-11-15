export type MindfulSettings = {
  enabled: boolean;
  thresholdCents: number;
};

export const DEFAULT_MINDFUL_SETTINGS: MindfulSettings = {
  enabled: true,
  thresholdCents: 10000,
};

/** What the step shows about the category budget. */
export type BudgetFact =
  | { kind: "none" }
  | {
      kind: "budget";
      remainingBeforeCents: number;
      remainingAfterCents: number;
      /** > 0 only when the purchase would exceed the budget. */
      overByCents: number;
    };

/** What the step shows about the available money. */
export type AvailableFact = {
  beforeCents: number;
  afterCents: number;
  /** False when the money comes from a reserve account: available does not change. */
  affectsAvailable: boolean;
  perDayAfterCents: number | null;
};
