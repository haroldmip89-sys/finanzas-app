export type SpendingByCategory = {
  categoryId: string;
  name: string;
  cents: number;
};

/** Spending of the month so far, compared with the same days of last month. */
export type SpendingSummary = {
  currentCents: number;
  /** Last month up to the same day number as today. */
  previousCents: number;
  byCategory: SpendingByCategory[];
};
