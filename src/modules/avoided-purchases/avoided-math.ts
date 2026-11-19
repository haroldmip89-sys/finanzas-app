import { addMonths, monthKeyRange, currentMonthKey, todayInLima, addDays } from "@/lib/dates";

import type {
  AvoidedCategoryShare,
  AvoidedItem,
  AvoidedTotals,
} from "./types/avoided.types";

/** Totals by status: only the avoided ones count as avoided. */
export function summarize(items: Pick<AvoidedItem, "status" | "amountCents">[]): AvoidedTotals {
  const totals: AvoidedTotals = { avoidedCount: 0, avoidedCents: 0, postponedCount: 0, postponedCents: 0 };
  for (const item of items) {
    if (item.status === "avoided") {
      totals.avoidedCount += 1;
      totals.avoidedCents += item.amountCents;
    } else {
      totals.postponedCount += 1;
      totals.postponedCents += item.amountCents;
    }
  }
  return totals;
}

export const NO_CATEGORY_LABEL = "Sin categoría";

/** Where most was avoided: avoided purchases grouped by category, biggest first. */
export function groupByCategory(
  items: Pick<AvoidedItem, "status" | "amountCents" | "categoryId" | "categoryName">[],
): AvoidedCategoryShare[] {
  const groups = new Map<string | null, AvoidedCategoryShare>();
  for (const item of items) {
    if (item.status !== "avoided") continue;
    const key = item.categoryId;
    const group = groups.get(key) ?? {
      categoryId: key,
      name: item.categoryName ?? NO_CATEGORY_LABEL,
      count: 0,
      cents: 0,
    };
    group.count += 1;
    group.cents += item.amountCents;
    groups.set(key, group);
  }
  return [...groups.values()].sort(
    (a, b) => b.cents - a.cents || a.name.localeCompare(b.name, "es"),
  );
}

/**
 * The span of a month that is compared with the month before: up to today for
 * the current month, the whole month for a past one. The month before is cut
 * at the same day number (or its last day when it is shorter).
 */
export function comparisonRanges(
  month: string,
  now: Date = new Date(),
): { current: { from: string; to: string }; previous: { from: string; to: string } } {
  const { from, to } = monthKeyRange(month);
  const today = todayInLima(now);
  const currentTo = month === currentMonthKey(now) ? today : to;
  const day = Number(currentTo.slice(8));

  const previousRange = monthKeyRange(addMonths(month, -1));
  const previousDay = Math.min(day, Number(previousRange.to.slice(8)));

  return {
    current: { from, to: currentTo },
    previous: { from: previousRange.from, to: addDays(previousRange.from, previousDay - 1) },
  };
}
