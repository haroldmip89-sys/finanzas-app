import { isCreditAccount, isLiquidAccount } from "./account-kind";
import type { AccountType } from "./types/account.types";

type BalanceAccount = {
  type: AccountType;
  balanceCents: number;
  archivedAt: Date | null;
};

/** Debt of a card: its negative balance as a positive amount (never below 0). */
export function getDebtCents(balanceCents: number): number {
  return Math.max(0, -balanceCents);
}

export type DebtDescription =
  | { kind: "debt"; cents: number }
  | { kind: "credit"; cents: number }
  | { kind: "none"; cents: 0 };

/** What to show for a card: debt, credit in its favor, or nothing owed. */
export function describeDebt(balanceCents: number): DebtDescription {
  if (balanceCents < 0) return { kind: "debt", cents: -balanceCents };
  if (balanceCents > 0) return { kind: "credit", cents: balanceCents };
  return { kind: "none", cents: 0 };
}

/** Money you can spend: balances of liquid, non-archived accounts. */
export function sumLiquidBalance(accounts: BalanceAccount[]): number {
  return accounts
    .filter((a) => isLiquidAccount(a.type) && a.archivedAt === null)
    .reduce((sum, a) => sum + a.balanceCents, 0);
}

/** Total owed on non-archived cards. A card with credit in its favor does not offset another one. */
export function sumCardDebt(accounts: BalanceAccount[]): number {
  return accounts
    .filter((a) => isCreditAccount(a.type) && a.archivedAt === null)
    .reduce((sum, a) => sum + getDebtCents(a.balanceCents), 0);
}

export type SpendingChange =
  | { kind: "none" }
  | { kind: "same" }
  | { kind: "more"; cents: number }
  | { kind: "less"; cents: number };

/** How this month's card purchases compare with last month's. */
export function describeSpendingChange(current: number, previous: number): SpendingChange {
  if (current === 0 && previous === 0) return { kind: "none" };
  if (current === previous) return { kind: "same" };
  return current > previous
    ? { kind: "more", cents: current - previous }
    : { kind: "less", cents: previous - current };
}
