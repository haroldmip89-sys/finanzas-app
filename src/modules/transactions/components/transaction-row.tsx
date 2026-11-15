import { ResourceCard, type ResourceAction } from "@/components/shared/resource-card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/dates";
import { formatPen } from "@/lib/money";
import { cn } from "@/lib/utils";
import { getCategoryIcon } from "@/modules/categories/components/category-icon";

import type { TransactionListItem } from "../types/transaction.types";

type TransactionRowProps = {
  transaction: TransactionListItem;
  onEdit: (transaction: TransactionListItem) => void;
  onDelete: (transaction: TransactionListItem) => void;
};

export function TransactionRow({ transaction, onEdit, onDelete }: TransactionRowProps) {
  const isExpense = transaction.type === "expense";
  const details = [
    formatDate(transaction.date),
    transaction.accountName,
    transaction.note,
  ].filter(Boolean);

  // Balance adjustments cannot be edited (delete it and calibrate again).
  const actions: ResourceAction[] = [
    ...(transaction.isAdjustment
      ? []
      : [{ label: "Editar", onSelect: () => onEdit(transaction) }]),
    { label: "Eliminar", onSelect: () => onDelete(transaction), destructive: true },
  ];

  return (
    <ResourceCard
      icon={getCategoryIcon(transaction.categoryIcon)}
      title={transaction.categoryName}
      subtitle={details.join(" · ")}
      value={
        <span className={cn(!isExpense && "text-income")}>
          {isExpense ? "−" : "+"}
          {formatPen(transaction.amountCents)}
        </span>
      }
      badge={transaction.isAdjustment ? <Badge variant="outline">Ajuste</Badge> : undefined}
      actions={actions}
      menuLabel={`Acciones de ${transaction.categoryName} del ${formatDate(transaction.date)}`}
    />
  );
}
