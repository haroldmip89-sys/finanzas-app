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

/** First and last day of the month before the current one, in Lima. */
export function previousMonthRange(now: Date = new Date()): { from: string; to: string } {
  const { from } = currentMonthRange(now);
  const [year, month] = from.split("-").map(Number);
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const lastDay = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();
  return {
    from: `${prevYear}-${pad(prevMonth)}-01`,
    to: `${prevYear}-${pad(prevMonth)}-${pad(lastDay)}`,
  };
}

const MONTH_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** A month as "YYYY-MM". */
export function isValidMonthKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** The current month in Lima as "YYYY-MM". */
export function currentMonthKey(now: Date = new Date()): string {
  return todayInLima(now).slice(0, 7);
}

/** Moves a "YYYY-MM" month forward or back by `months` (crossing years). */
export function addMonths(key: string, months: number): string {
  const [year, month] = key.split("-").map(Number);
  const total = year * 12 + (month - 1) + months;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
}

/** First and last day of a "YYYY-MM" month. */
export function monthKeyRange(key: string): { from: string; to: string } {
  const [year, month] = key.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${key}-01`, to: `${key}-${pad(lastDay)}` };
}

/** "2026-11" -> "noviembre 2026". Returns the input if it is not a valid month. */
export function formatMonth(key: string): string {
  if (!isValidMonthKey(key)) return key;
  const [year, month] = key.split("-").map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
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

/** Adds days to a "YYYY-MM-DD" day (negative to go back) without timezone shifts. */
export function addDays(value: string, days: number): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}
