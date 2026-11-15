import type { ErrorCode, FieldErrors } from "./errors";

export type ActionError = {
  code: ErrorCode;
  message: string;
  fieldErrors?: FieldErrors;
};

/** What every server action returns: errors are data, never thrown to the client. */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };

/** Error thrown on the client by `unwrapResult`; carries the action error. */
export class ActionFailure extends Error {
  readonly code: ErrorCode;
  readonly fieldErrors?: FieldErrors;

  constructor(error: ActionError) {
    super(error.message);
    this.name = "ActionFailure";
    this.code = error.code;
    this.fieldErrors = error.fieldErrors;
  }
}

/** Turns an `ActionResult` into its data, or throws `ActionFailure`. */
export function unwrapResult<T>(result: ActionResult<T>): T {
  if (result.ok) return result.data;
  throw new ActionFailure(result.error);
}

const GENERIC_MESSAGE = "Ocurrió un error inesperado. Inténtalo de nuevo.";

/** Safe message to show for anything thrown while calling an action. */
export function errorMessage(error: unknown): string {
  return error instanceof ActionFailure ? error.message : GENERIC_MESSAGE;
}
