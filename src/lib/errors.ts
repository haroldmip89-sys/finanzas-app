export type ErrorCode =
  | "VALIDATION"
  | "CONFLICT"
  | "NOT_FOUND"
  | "IN_USE"
  | "UNAUTHORIZED"
  | "INTERNAL";

/** Field name -> message, shown next to the form control. */
export type FieldErrors = Record<string, string>;

/**
 * Error with a message that is safe to show to the user. Services throw it;
 * anything else is treated as unexpected and never shown as-is.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly fieldErrors?: FieldErrors;

  constructor(code: ErrorCode, message: string, fieldErrors?: FieldErrors) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

/** Postgres SQLSTATE of an error, looking through `cause` (drizzle wraps it). */
export function pgErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

export const PG_UNIQUE_VIOLATION = "23505";
export const PG_FOREIGN_KEY_VIOLATION = "23503";
// Raised by ON DELETE RESTRICT (NO ACTION raises 23503 instead).
export const PG_RESTRICT_VIOLATION = "23001";

/** True when the error means the row is still referenced by another table. */
export function isInUseError(error: unknown): boolean {
  const code = pgErrorCode(error);
  return code === PG_FOREIGN_KEY_VIOLATION || code === PG_RESTRICT_VIOLATION;
}
