/**
 * What is safe to write to the server logs about an unexpected error.
 *
 * Drizzle puts the bound parameters in the error message ("Failed query: ...
 * params: ...") and Postgres puts values in `detail` ("Key (name)=(Efectivo)
 * already exists"). Both contain what the user typed, so neither is logged:
 * only the error name, the Postgres code and the message up to its first line,
 * with any "params:" part cut off.
 */
export type SafeErrorLog = {
  name: string;
  code?: string;
  message: string;
  cause?: { name: string; code?: string; message: string };
};

const MAX_MESSAGE = 300;

function clean(message: unknown): string {
  const text = typeof message === "string" ? message : "";
  const firstLine = text.split("\n")[0];
  const withoutParams = firstLine.replace(/\s*params:.*$/i, "");
  return withoutParams.slice(0, MAX_MESSAGE);
}

function describeOne(error: unknown): { name: string; code?: string; message: string } {
  if (error instanceof Error || (typeof error === "object" && error !== null)) {
    const e = error as { name?: unknown; code?: unknown; message?: unknown };
    return {
      name: typeof e.name === "string" ? e.name : "Error",
      code: typeof e.code === "string" ? e.code : undefined,
      message: clean(e.message),
    };
  }
  return { name: typeof error, message: "" };
}

export function describeErrorForLog(error: unknown): SafeErrorLog {
  const main = describeOne(error);
  const cause = (error as { cause?: unknown } | null)?.cause;
  return cause === undefined || cause === null ? main : { ...main, cause: describeOne(cause) };
}
