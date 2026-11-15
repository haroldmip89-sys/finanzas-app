import { Badge } from "@/components/ui/badge";
import { ResourceCard, type ResourceAction } from "@/components/shared/resource-card";
import { formatPen } from "@/lib/money";

import { isCreditAccount } from "../account-kind";
import { describeDebt } from "../card-summary";
import { ACCOUNT_TYPE_META } from "../constants/account-types";
import type { AccountWithBalance } from "../types/account.types";

type AccountCardProps = {
  account: AccountWithBalance;
  onEdit: (account: AccountWithBalance) => void;
  onCalibrate: (account: AccountWithBalance) => void;
  /** Pays the card: only used for credit cards. */
  onPay: (account: AccountWithBalance) => void;
  onToggleArchived: (account: AccountWithBalance) => void;
  onDelete: (account: AccountWithBalance) => void;
};

function DebtValue({ balanceCents }: { balanceCents: number }) {
  const debt = describeDebt(balanceCents);
  if (debt.kind === "none") return <span className="text-muted-foreground">Sin deuda</span>;
  if (debt.kind === "credit") return <span className="text-income">A favor {formatPen(debt.cents)}</span>;
  return <span className="text-debt">Deuda {formatPen(debt.cents)}</span>;
}

export function AccountCard({
  account,
  onEdit,
  onCalibrate,
  onPay,
  onToggleArchived,
  onDelete,
}: AccountCardProps) {
  const meta = ACCOUNT_TYPE_META[account.type];
  const archived = account.archivedAt !== null;
  const isCard = isCreditAccount(account.type);

  const actions: ResourceAction[] = [
    { label: "Editar", onSelect: () => onEdit(account) },
    // An archived account cannot be paid or calibrated.
    ...(archived || !isCard ? [] : [{ label: "Pagar tarjeta", onSelect: () => onPay(account) }]),
    ...(archived ? [] : [{ label: "Calibrar saldo", onSelect: () => onCalibrate(account) }]),
    {
      label: archived ? "Desarchivar" : "Archivar",
      onSelect: () => onToggleArchived(account),
    },
    { label: "Eliminar", onSelect: () => onDelete(account), destructive: true },
  ];

  return (
    <ResourceCard
      icon={meta.icon}
      title={account.name}
      subtitle={
        isCard ? "Tarjeta de crédito" : `${meta.label} · Inicial ${formatPen(account.initialBalanceCents)}`
      }
      value={
        isCard ? <DebtValue balanceCents={account.balanceCents} /> : formatPen(account.balanceCents)
      }
      badge={archived ? <Badge variant="secondary">Archivada</Badge> : undefined}
      archived={archived}
      actions={actions}
      menuLabel={`Acciones de ${account.name}`}
    />
  );
}
