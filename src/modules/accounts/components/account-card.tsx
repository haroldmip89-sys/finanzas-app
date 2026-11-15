import { Badge } from "@/components/ui/badge";
import { ResourceCard, type ResourceAction } from "@/components/shared/resource-card";
import { formatPen } from "@/lib/money";

import { ACCOUNT_TYPE_META } from "../constants/account-types";
import type { AccountWithBalance } from "../types/account.types";

type AccountCardProps = {
  account: AccountWithBalance;
  onEdit: (account: AccountWithBalance) => void;
  onCalibrate: (account: AccountWithBalance) => void;
  onToggleArchived: (account: AccountWithBalance) => void;
  onDelete: (account: AccountWithBalance) => void;
};

export function AccountCard({
  account,
  onEdit,
  onCalibrate,
  onToggleArchived,
  onDelete,
}: AccountCardProps) {
  const meta = ACCOUNT_TYPE_META[account.type];
  const archived = account.archivedAt !== null;

  const actions: ResourceAction[] = [
    { label: "Editar", onSelect: () => onEdit(account) },
    // An archived account cannot be calibrated.
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
      subtitle={`${meta.label} · Inicial ${formatPen(account.initialBalanceCents)}`}
      value={formatPen(account.balanceCents)}
      badge={archived ? <Badge variant="secondary">Archivada</Badge> : undefined}
      archived={archived}
      actions={actions}
      menuLabel={`Acciones de ${account.name}`}
    />
  );
}
