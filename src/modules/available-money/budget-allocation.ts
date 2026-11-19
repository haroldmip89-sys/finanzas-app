type BudgetLike = { amountCents: number; spentCents: number };

export type BudgetAllocation = {
  hasBudgets: boolean;
  /** What is still to be spent in the budgets (an exceeded budget adds nothing). */
  pendingCents: number;
  /** Available money minus what the budgets still hold; negative when they hold more. */
  unassignedCents: number;
};

/**
 * How much of the available money is already earmarked by this month's budgets.
 * Only the remaining part of each budget counts: what was already spent has
 * left the balances, and an exceeded budget does not give money back.
 */
export function computeBudgetAllocation(
  availableCents: number,
  budgets: BudgetLike[],
): BudgetAllocation {
  const pendingCents = budgets.reduce(
    (sum, b) => sum + Math.max(0, b.amountCents - b.spentCents),
    0,
  );

  return {
    hasBudgets: budgets.length > 0,
    pendingCents,
    unassignedCents: availableCents - pendingCents,
  };
}
