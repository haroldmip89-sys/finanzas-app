export type BudgetState = "ok" | "near" | "over";

export type BudgetStatus = {
  /** Whole percent spent, rounded down (it can exceed 100). */
  percent: number;
  /** Width of the progress bar: never above 100. */
  barPercent: number;
  state: BudgetState;
  /** Budgeted minus spent; negative when over budget. */
  remainingCents: number;
};

/** Spending at or above this share of the budget is "near the limit". */
export const NEAR_LIMIT_PERCENT = 80;

/**
 * Where a budget stands. Pure and exact (integer math): 79.99 % is still "ok"
 * and exactly 80 % is "near"; only going past 100 % is "over".
 */
export function getBudgetStatus(amountCents: number, spentCents: number): BudgetStatus {
  const percent = amountCents > 0 ? Math.floor((spentCents * 100) / amountCents) : 0;

  let state: BudgetState = "ok";
  if (spentCents > amountCents) state = "over";
  else if (spentCents * 100 >= amountCents * NEAR_LIMIT_PERCENT) state = "near";

  return {
    percent,
    barPercent: Math.min(100, Math.max(0, percent)),
    state,
    remainingCents: amountCents - spentCents,
  };
}
