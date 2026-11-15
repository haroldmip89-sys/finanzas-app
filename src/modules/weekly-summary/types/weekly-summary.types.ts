export type WeeklyCategory = { categoryId: string; name: string; cents: number };

export type WeeklySummary = {
  /** Monday of the week and today, "YYYY-MM-DD". */
  from: string;
  to: string;
  spentCents: number;
  /** Last week up to the same weekday. */
  previousSpentCents: number;
  /** Top categories of the week. */
  byCategory: WeeklyCategory[];
  avoidedCount: number;
  avoidedCents: number;
  /** Estimated available money at the start of the week and now. */
  availableAtStartCents: number;
  availableNowCents: number;
};
