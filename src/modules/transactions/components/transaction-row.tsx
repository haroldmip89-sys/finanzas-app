import { ResourceCard } from "@/components/shared/resource-card";
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

  return (
    <ResourceCard
      icon={getCategoryIcon(transaction.categoryIcon)}
      title={transaction.categoryName}
      subtitle={details.join(" · ")}
      value={
        <span className={cn(isExpense && "text-destructive")}>
          {isExpense ? "−" : "+"}
          {formatPen(transaction.amountCents)}
        </span>
      }
      actions={[
        { label: "Editar", onSelect: () => onEdit(transaction) },
        { label: "Eliminar", onSelect: () => onDelete(transaction), destructive: true },
      ]}
      menuLabel={`Acciones de ${transaction.categoryName} del ${formatDate(transaction.date)}`}
    />
  );
}
