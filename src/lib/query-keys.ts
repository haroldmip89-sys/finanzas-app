// Query keys that more than one module needs to invalidate. They live here so a
// module (e.g. transactions) can refresh another one's data without importing it.

/** Budgets depend on spending, so saving a transaction must refresh them. */
export const budgetsKey = ["budgets"] as const;
