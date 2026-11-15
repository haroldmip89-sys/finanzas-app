// Money is stored as integer cents of PEN (system-design.md §7). This is the
// only place that parses and formats amounts: never use parseFloat elsewhere.

const PEN_INPUT = /^-?\d+(\.\d{1,2})?$/;

const penFormatter = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});

/**
 * Parses a PEN amount ("12", "12.5", "-0.07") into integer cents. Works on the
 * digits (no floating point). Returns null when the input is not a plain
 * amount with up to 2 decimals.
 */
export function penToCents(input: string | number): number | null {
  const text = typeof input === "number" ? String(input) : input.trim();
  if (!PEN_INPUT.test(text)) return null;

  const negative = text.startsWith("-");
  const [whole, fraction = ""] = text.replace("-", "").split(".");
  const cents = Number(whole + fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) return null;
  return negative && cents !== 0 ? -cents : cents;
}

/** Integer cents -> form input value, e.g. 1250 -> "12.50". */
export function centsToPen(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(cents));
  const whole = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, "0");
  return `${sign}${whole}.${fraction}`;
}

/** Integer cents -> display string, e.g. 1250 -> "S/ 12.50". */
export function formatPen(cents: number): string {
  return penFormatter.format(Math.trunc(cents) / 100);
}

/**
 * Cleans what the user types in a money field: keeps digits and a single
 * decimal point (a comma becomes a point), at most 2 decimals, and an optional
 * leading minus when negatives are allowed. A leading "." becomes "0.".
 */
export function sanitizeMoneyInput(
  raw: string,
  options: { allowNegative?: boolean } = {},
): string {
  const text = raw.replace(",", ".");
  const negative = options.allowNegative === true && text.trimStart().startsWith("-");

  const cleaned = text.replace(/[^\d.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  const hasPoint = rest.length > 0;
  const fraction = rest.join("").slice(0, 2);

  let value = whole;
  if (hasPoint) value = `${whole === "" ? "0" : whole}.${fraction}`;
  return negative ? `-${value}` : value;
}
