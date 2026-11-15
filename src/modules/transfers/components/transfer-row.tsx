import { ArrowLeftRight } from "lucide-react";

import { ResourceCard } from "@/components/shared/resource-card";
import { formatDate } from "@/lib/dates";
import { formatPen } from "@/lib/money";

import type { TransferListItem } from "../types/transfer.types";

type TransferRowProps = {
  transfer: TransferListItem;
  onEdit: (transfer: TransferListItem) => void;
  onDelete: (transfer: TransferListItem) => void;
};

export function TransferRow({ transfer, onEdit, onDelete }: TransferRowProps) {
  const title = `${transfer.fromAccountName} → ${transfer.toAccountName}`;
  const details = [formatDate(transfer.date), transfer.note].filter(Boolean);

  return (
    <ResourceCard
      icon={ArrowLeftRight}
      title={title}
      subtitle={details.join(" · ")}
      // Neutral amount: a transfer is neither income nor expense.
      value={formatPen(transfer.amountCents)}
      actions={[
        { label: "Editar", onSelect: () => onEdit(transfer) },
        { label: "Eliminar", onSelect: () => onDelete(transfer), destructive: true },
      ]}
      menuLabel={`Acciones de la transferencia ${title} del ${formatDate(transfer.date)}`}
    />
  );
}
