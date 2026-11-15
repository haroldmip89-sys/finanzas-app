import type { budgets } from "@/db/schema";

export type Budget = typeof budgets.$inferSelect;

/** A budget of the month with what has been spent in its category. */
export type BudgetListItem = {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  amountCents: number;
  spentCents: number;
};

/** A category with spending in the month and no budget. */
export type UnbudgetedItem = {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  spentCents: number;
};

export type BudgetTotals = {
  budgetedCents: number;
  /** Spent in the budgeted categories only. */
  spentCents: number;
  /** Budgeted minus spent; negative when over. */
  remainingCents: number;
};

export type BudgetsOverview = {
  month: string;
  items: BudgetListItem[];
  unbudgeted: UnbudgetedItem[];
  totals: BudgetTotals;
  /** Whether the month before has budgets that could be copied. */
  previousMonthHasBudgets: boolean;
};
