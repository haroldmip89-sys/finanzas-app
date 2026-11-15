// Dates are plain calendar days ("YYYY-MM-DD") in America/Lima (system-design.md §7).
// Never use `new Date("YYYY-MM-DD")` to format them: it is parsed as UTC and
// can shift the day.

const TIME_ZONE = "America/Lima";

const MONTHS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const pad = (n: number) => String(n).padStart(2, "0");

/** Today's date in Lima as "YYYY-MM-DD". */
export function todayInLima(now: Date = new Date()): string {
  return dayFormatter.format(now);
}

/** First and last day of the current month in Lima. */
export function currentMonthRange(now: Date = new Date()): { from: string; to: string } {
  const [year, month] = todayInLima(now).split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
}

/** True for a real calendar day in "YYYY-MM-DD" format (leap years included). */
export function isValidDateString(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** "2026-11-15" -> "15 nov 2026". Returns the input if it is not a valid date. */
export function formatDate(value: string): string {
  if (!isValidDateString(value)) return value;
  const [year, month, day] = value.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}
