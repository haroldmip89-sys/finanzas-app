import type { AccountType } from "./types/account.types";

/**
 * Credit accounts (cards) are debt, not money you can spend. Cash, bank and
 * wallet accounts are liquid. The kind comes from the account type: there is
 * no extra field, so this is the single place that decides it.
 */
export function isCreditAccount(type: AccountType): boolean {
  return type === "card";
}

export function isLiquidAccount(type: AccountType): boolean {
  return !isCreditAccount(type);
}
