import { computeAvailableMoney } from "@/modules/available-money/available-money";
import type { AccountType } from "@/modules/accounts/types/account.types";

import type { AvailableFact, BudgetFact } from "./types/mindful-purchase.types";

type ShouldAskInput = {
  enabled: boolean;
  thresholdCents: number;
  type: "income" | "expense";
  isEditing: boolean;
  amountCents: number;
  /** Balance adjustments (system categories) never trigger the step. */
  isSystemCategory?: boolean;
};

/** The step only opens when creating an expense at or above the threshold. */
export function shouldAsk(input: ShouldAskInput): boolean {
  return (
    input.enabled &&
    input.type === "expense" &&
    !input.isEditing &&
    !input.isSystemCategory &&
    input.amountCents > 0 &&
    input.amountCents >= input.thresholdCents
  );
}

type FactAccount = {
  id: string;
  type: AccountType;
  balanceCents: number;
  archivedAt: Date | null;
  includeInAvailable: boolean;
};

type EvaluateInput = {
  amountCents: number;
  accountId: string;
  accounts: FactAccount[];
  /** Budget of the category in the month of the purchase, if there is one. */
  budget: { amountCents: number; spentCents: number } | null;
  now?: Date;
};

/** Facts about a purchase that has not been registered yet. */
export function evaluateMindfulPurchase(input: EvaluateInput): {
  budget: BudgetFact;
  available: AvailableFact;
} {
  const { amountCents, accountId, accounts, budget, now } = input;

  const before = computeAvailableMoney(accounts, now);
  // The expense lowers the balance of its account (a card owes more).
  const after = computeAvailableMoney(
    accounts.map((a) =>
      a.id === accountId ? { ...a, balanceCents: a.balanceCents - amountCents } : a,
    ),
    now,
  );

  const budgetFact: BudgetFact = budget
    ? (() => {
        const remainingBeforeCents = budget.amountCents - budget.spentCents;
        const remainingAfterCents = remainingBeforeCents - amountCents;
        return {
          kind: "budget" as const,
          remainingBeforeCents,
          remainingAfterCents,
          overByCents: remainingAfterCents < 0 ? -remainingAfterCents : 0,
        };
      })()
    : { kind: "none" };

  return {
    budget: budgetFact,
    available: {
      beforeCents: before.availableCents,
      afterCents: after.availableCents,
      affectsAvailable: before.availableCents !== after.availableCents,
      perDayAfterCents: after.perDayCents,
    },
  };
}

const MINUTE_MS = 60_000;

export type PauseOption = "10m" | "24h";

/** When to decide again, as an ISO timestamp. */
export function revisitAtFor(option: PauseOption, now: Date = new Date()): string {
  const minutes = option === "10m" ? 10 : 24 * 60;
  return new Date(now.getTime() + minutes * MINUTE_MS).toISOString();
}
