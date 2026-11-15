import { currentMonthRange, todayInLima } from "@/lib/dates";
import { sumCardDebt } from "@/modules/accounts/card-summary";
import { isLiquidAccount } from "@/modules/accounts/account-kind";
import type { AccountType } from "@/modules/accounts/types/account.types";

type AvailableAccount = {
  type: AccountType;
  balanceCents: number;
  archivedAt: Date | null;
  includeInAvailable: boolean;
};

export type AvailableMoney = {
  /** Balances of every liquid, active account (reserved ones included). */
  liquidCents: number;
  /** Balances of liquid accounts set aside ("incluir en dinero disponible" off). */
  reservedCents: number;
  /** Total owed on cards. */
  cardDebtCents: number;
  /** liquid - reserved - card debt. May be negative. */
  availableCents: number;
  /** Last day of the planning period (end of the current month, Lima). */
  periodEnd: string;
  /** Days from today to the end of the month, both included. */
  daysLeft: number;
  /** availableCents spread over daysLeft; null when there is nothing to spread. */
  perDayCents: number | null;
};

/**
 * Estimated money you can really spend until the end of the month:
 * liquid money of the included accounts minus what is owed on cards.
 * Balance adjustments are transactions, so they are already in the balances.
 */
export function computeAvailableMoney(
  accounts: AvailableAccount[],
  now: Date = new Date(),
): AvailableMoney {
  const active = accounts.filter((a) => a.archivedAt === null);
  const liquid = active.filter((a) => isLiquidAccount(a.type));

  const liquidCents = liquid.reduce((sum, a) => sum + a.balanceCents, 0);
  const reservedCents = liquid
    .filter((a) => !a.includeInAvailable)
    .reduce((sum, a) => sum + a.balanceCents, 0);
  const cardDebtCents = sumCardDebt(accounts);
  const availableCents = liquidCents - reservedCents - cardDebtCents;

  const periodEnd = currentMonthRange(now).to;
  const daysLeft = Number(periodEnd.slice(8)) - Number(todayInLima(now).slice(8)) + 1;

  return {
    liquidCents,
    reservedCents,
    cardDebtCents,
    availableCents,
    periodEnd,
    daysLeft,
    perDayCents: availableCents > 0 ? Math.floor(availableCents / daysLeft) : null,
  };
}
