import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";

import type { ActionError, ActionResult } from "./action-result";
import {
  AppError,
  PG_UNIQUE_VIOLATION,
  isInUseError,
  pgErrorCode,
  type FieldErrors,
} from "./errors";
import { describeErrorForLog } from "./safe-log";

const INTERNAL_MESSAGE = "Ocurrió un error inesperado. Inténtalo de nuevo.";

function zodFieldErrors(error: ZodError): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "form";
    fields[key] ??= issue.message;
  }
  return fields;
}

/** Maps any thrown value to a safe `ActionError`; logs the unexpected ones. */
export function toActionError(error: unknown): ActionError {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      fieldErrors: error.fieldErrors,
    };
  }
  if (error instanceof ZodError) {
    return {
      code: "VALIDATION",
      message: "Revisa los datos ingresados.",
      fieldErrors: zodFieldErrors(error),
    };
  }
  const pgCode = pgErrorCode(error);
  if (pgCode === PG_UNIQUE_VIOLATION) {
    return { code: "CONFLICT", message: "Ya existe un registro con esos datos." };
  }
  if (isInUseError(error)) {
    return {
      code: "IN_USE",
      message: "El registro está en uso y no se puede modificar así.",
    };
  }
  // Never the raw error: it can carry the values the user typed (see safe-log.ts).
  console.error("[action] unexpected error", describeErrorForLog(error));
  return { code: "INTERNAL", message: INTERNAL_MESSAGE };
}

/**
 * Runs a server action body and returns an `ActionResult`. Next.js control-flow
 * exceptions (redirect, notFound, auth.protect) are re-thrown untouched.
 */
export async function runAction<T>(
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, error: toActionError(error) };
  }
}
