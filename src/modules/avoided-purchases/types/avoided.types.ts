import type { avoidedPurchases } from "@/db/schema";

export type AvoidedPurchase = typeof avoidedPurchases.$inferSelect;
export type AvoidedStatus = AvoidedPurchase["status"];
export type AvoidedReason = NonNullable<AvoidedPurchase["reason"]>;

/** A purchase with the category name and icon needed to render a row. */
export type AvoidedItem = {
  id: string;
  amountCents: number;
  date: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  reason: AvoidedReason | null;
  note: string | null;
  status: AvoidedStatus;
  /** When a postponed purchase should be asked about again; null otherwise. */
  remindAt: Date | null;
};

export type AvoidedTotals = {
  /** Purchases decided against for good: the only ones that add up. */
  avoidedCount: number;
  avoidedCents: number;
  /** Purchases put off: they may still end in a purchase. */
  postponedCount: number;
  postponedCents: number;
};

export type AvoidedCategoryShare = {
  categoryId: string | null;
  name: string;
  count: number;
  cents: number;
};

export type AvoidedOverview = {
  month: string;
  items: AvoidedItem[];
  totals: AvoidedTotals;
  /** Categories where most was avoided (avoided only), biggest first. */
  byCategory: AvoidedCategoryShare[];
  /** Avoided purchases of the month before, up to the same day number. */
  previous: { count: number; cents: number };
};
