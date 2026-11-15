"use client";

import { isCreditAccount } from "@/modules/accounts/account-kind";
import { getDebtCents, sumCardDebt } from "@/modules/accounts/card-summary";
import { useAccounts } from "@/modules/accounts/hooks/use-accounts";
import { formatPen } from "@/lib/money";

import { DashboardSection } from "./dashboard-section";

/** What is owed on cards. Hidden for people without cards. */
export function DebtSummary() {
  const accounts = useAccounts(false);
  if (!accounts.data) return null;

  const cards = accounts.data.filter((a) => isCreditAccount(a.type));
  if (cards.length === 0) return null;

  const debtCents = sumCardDebt(accounts.data);
  const withDebt = cards.filter((c) => getDebtCents(c.balanceCents) > 0).length;

  return (
    <DashboardSection title="Deuda de tarjetas">
      <p className="text-[26px] leading-8 font-bold text-debt">{formatPen(debtCents)}</p>
      <p className="text-[13px] text-muted-foreground">
        {withDebt} de {cards.length} {cards.length === 1 ? "tarjeta" : "tarjetas"} con deuda
      </p>
    </DashboardSection>
  );
}
