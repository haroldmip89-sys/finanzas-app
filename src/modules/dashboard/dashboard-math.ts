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

/**
 * Spending per day as a list: position 0 is the first day of the range. Days
 * without spending are 0, so the series has one value per day of the range.
 */
export function toDailySeries(
  rows: { date: string; cents: number }[],
  from: string,
  days: number,
): number[] {
  const series = Array.from({ length: days }, () => 0);
  const byDate = new Map(rows.map((r) => [r.date, r.cents]));
  for (let i = 0; i < days; i++) {
    series[i] = byDate.get(addDays(from, i)) ?? 0;
  }
  return series;
}

/** Running total: position i is what was spent from the first day up to day i + 1. */
export function cumulative(daily: number[]): number[] {
  let total = 0;
  return daily.map((cents) => (total += cents));
}

export type TrendComparison = {
  currentCents: number;
  previousCents: number;
  /** Current minus previous; negative when spending less than last month. */
  diffCents: number;
  /** Variation in whole percent; null when there is no previous spending to compare with. */
  pct: number | null;
  /** Average spending per day, rounded down to cents. */
  currentAvgCents: number;
  previousAvgCents: number;
};

/** Totals of the two periods with the difference, the variation and the daily averages. */
export function compareTrend(
  currentDaily: number[],
  previousDaily: number[],
): TrendComparison {
  const sum = (list: number[]) => list.reduce((a, b) => a + b, 0);
  const currentCents = sum(currentDaily);
  const previousCents = sum(previousDaily);
  const avg = (total: number, days: number) => (days > 0 ? Math.floor(total / days) : 0);

  return {
    currentCents,
    previousCents,
    diffCents: currentCents - previousCents,
    pct: previousCents > 0 ? Math.round(((currentCents - previousCents) / previousCents) * 100) : null,
    currentAvgCents: avg(currentCents, currentDaily.length),
    previousAvgCents: avg(previousCents, previousDaily.length),
  };
}

/** Rounds a positive amount up to a tidy axis maximum (1, 2, 2.5, 5 or 10 times a power of ten). */
export function niceMax(value: number): number {
  if (value <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => value <= s * magnitude) ?? 10;
  return step * magnitude;
}

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
