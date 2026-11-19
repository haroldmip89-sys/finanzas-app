export type SpendingByCategory = {
  categoryId: string;
  name: string;
  cents: number;
};

/** Daily spending of this month so far and of last month up to the same day. */
export type DailySpending = {
  /** Cents per day: position 0 is day 1 of this month, up to today. */
  currentDaily: number[];
  /** Cents per day of last month, up to today's day number (or its last day). */
  previousDaily: number[];
};

/** Spending of the month so far, compared with the same days of last month. */
export type SpendingSummary = {
  currentCents: number;
  /** Last month up to the same day number as today. */
  previousCents: number;
  byCategory: SpendingByCategory[];
};
