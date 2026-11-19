import { addMonths, currentMonthKey, formatMonth } from "@/lib/dates";

/** "octubre" while we are in November. */
export function previousMonthName(now: Date = new Date()): string {
  return formatMonth(addMonths(currentMonthKey(now), -1)).split(" ")[0];
}
