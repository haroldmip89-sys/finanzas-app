import { formatPen } from "@/lib/money";
import { computeBudgetAllocation } from "@/modules/available-money/budget-allocation";

type BudgetLike = { categoryId: string; amountCents: number; spentCents: number };

export type BudgetFact =
  | { kind: "within"; categoryName: string; remainingAfterCents: number }
  | { kind: "over"; categoryName: string; overCents: number };

export type AffordabilityFact = {
  /** What the amount is compared with: money not earmarked by budgets, or all the available money. */
  basis: "unassigned" | "available";
  kind: "within" | "over";
  /** What is left after the purchase (within) or by how much it is exceeded (over). */
  cents: number;
};

export type PurchaseFacts = {
  /** Null when the category has no budget this month, or there is no category. */
  budget: BudgetFact | null;
  /** Null while the available money is not known. */
  affordability: AffordabilityFact | null;
};

type Input = {
  amountCents: number;
  categoryId: string | null;
  categoryName: string | null;
  /** Estimated available money (spec 009a); null while it is loading. */
  availableCents: number | null;
  /** This month's budgets; null while they are loading or failed. */
  budgets: BudgetLike[] | null;
};

/**
 * The facts behind the three questions of a mindful purchase, with no verdict:
 * how it fits the category budget and the money that is not earmarked.
 */
export function evaluatePurchase({
  amountCents,
  categoryId,
  categoryName,
  availableCents,
  budgets,
}: Input): PurchaseFacts {
  let budget: BudgetFact | null = null;
  const categoryBudget = categoryId && budgets ? budgets.find((b) => b.categoryId === categoryId) : undefined;
  if (categoryBudget && categoryName) {
    const after = categoryBudget.amountCents - categoryBudget.spentCents - amountCents;
    budget =
      after >= 0
        ? { kind: "within", categoryName, remainingAfterCents: after }
        : { kind: "over", categoryName, overCents: -after };
  }

  let affordability: AffordabilityFact | null = null;
  if (availableCents !== null && budgets !== null) {
    const allocation = computeBudgetAllocation(availableCents, budgets);
    const base = allocation.hasBudgets ? allocation.unassignedCents : availableCents;
    const after = base - amountCents;
    affordability = {
      basis: allocation.hasBudgets ? "unassigned" : "available",
      kind: after >= 0 ? "within" : "over",
      cents: Math.abs(after),
    };
  }

  return { budget, affordability };
}

/** Neutral wording: facts only, no orders and no blame. */
export function describeBudgetFact(fact: BudgetFact): string {
  return fact.kind === "within"
    ? `Te quedarían ${formatPen(fact.remainingAfterCents)} en ${fact.categoryName}.`
    : `Te pasarías ${formatPen(fact.overCents)} de tu presupuesto de ${fact.categoryName}.`;
}

export function describeAffordabilityFact(fact: AffordabilityFact): string {
  const what = fact.basis === "unassigned" ? "sin asignar" : "disponibles";
  return fact.kind === "within"
    ? `Te quedarían ${formatPen(fact.cents)} ${what} (estimado).`
    : `Supera tu dinero ${what} en ${formatPen(fact.cents)} (estimado).`;
}
