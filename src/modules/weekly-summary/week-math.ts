import { addDays, todayInLima } from "@/lib/dates";

export type WeekRanges = {
  /** Monday of the current week. */
  from: string;
  /** Today (Lima). */
  to: string;
  /** Previous week, up to the same weekday as today. */
  previous: { from: string; to: string };
};

/** 0 = Monday ... 6 = Sunday, for a "YYYY-MM-DD" day. */
function weekdayIndex(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/**
 * This week so far (Monday to today, Lima) and last week up to the same
 * weekday, so the two spans have the same length.
 */
export function weekRanges(now: Date = new Date()): WeekRanges {
  const today = todayInLima(now);
  const elapsed = weekdayIndex(today);
  const from = addDays(today, -elapsed);
  const previousFrom = addDays(from, -7);
  return {
    from,
    to: today,
    previous: { from: previousFrom, to: addDays(previousFrom, elapsed) },
  };
}
