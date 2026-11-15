export type AvoidedStatus = "avoided" | "postponed";
export type AvoidedReason = "not_needed" | "over_budget" | "can_wait" | "other";

export type AvoidedPurchase = {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  amountCents: number;
  /** Local day in Lima, "YYYY-MM-DD". */
  date: string;
  status: AvoidedStatus;
  reason: AvoidedReason | null;
  note: string | null;
  /** Suggested moment to decide again (ISO); only for postponed purchases. */
  revisitAt: string | null;
};

export type AvoidedCategoryTotal = {
  categoryId: string;
  categoryName: string;
  cents: number;
  count: number;
};

/** Figures of the current month; only `avoided` purchases count as avoided. */
export type AvoidedSummary = {
  avoidedCount: number;
  avoidedCents: number;
  previousAvoidedCount: number;
  previousAvoidedCents: number;
  postponedCount: number;
  postponedCents: number;
  /** Where most is avoided this month. */
  byCategory: AvoidedCategoryTotal[];
};

export type AvoidedOverview = {
  items: AvoidedPurchase[];
  summary: AvoidedSummary;
};
