import { addDays, currentMonthRange, previousMonthRange, todayInLima } from "@/lib/dates";

/**
 * The two spans compared on the dashboard: this month up to today, and last
 * month up to the same day number (or its last day if it is shorter).
 */
export function comparableRanges(now: Date = new Date()): {
  current: { from: string; to: string };
  previous: { from: string; to: string };
} {
  const today = todayInLima(now);
  const previous = previousMonthRange(now);
  const day = Number(today.slice(8));
  const lastPreviousDay = Number(previous.to.slice(8));

  return {
    current: { from: currentMonthRange(now).from, to: today },
    previous: { from: previous.from, to: addDays(previous.from, Math.min(day, lastPreviousDay) - 1) },
  };
}

export type CategorySpend = { name: string; cents: number };

export type SpendShare = CategorySpend & {
  /** Share of the total, 0 to 100. */
  pct: number;
  isOther: boolean;
};

const TOP = 4;

/**
 * The categories with most spending, plus "Otros" for the rest. With five or
 * fewer categories they are all shown (an "Otros" of one makes no sense).
 */
export function groupTopCategories(items: CategorySpend[], top: number = TOP): SpendShare[] {
  const positive = items.filter((i) => i.cents > 0);
  const total = positive.reduce((sum, i) => sum + i.cents, 0);
  if (total === 0) return [];

  const sorted = [...positive].sort(
    (a, b) => b.cents - a.cents || a.name.localeCompare(b.name, "es"),
  );
  const share = (item: CategorySpend, isOther: boolean): SpendShare => ({
    ...item,
    pct: (item.cents / total) * 100,
    isOther,
  });

  if (sorted.length <= top + 1) return sorted.map((i) => share(i, false));

  const shown = sorted.slice(0, top).map((i) => share(i, false));
  const otherCents = sorted.slice(top).reduce((sum, i) => sum + i.cents, 0);
  return [...shown, share({ name: "Otros", cents: otherCents }, true)];
}
