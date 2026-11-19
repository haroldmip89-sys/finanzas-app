import { ResourceCard, type ResourceAction } from "@/components/shared/resource-card";
import { formatDate } from "@/lib/dates";
import { formatPen } from "@/lib/money";
import { getCategoryIcon } from "@/modules/categories/components/category-icon";

import { reasonLabel } from "../constants/avoided-reasons";
import type { AvoidedItem } from "../types/avoided.types";

type AvoidedRowProps = {
  item: AvoidedItem;
  onEdit: (item: AvoidedItem) => void;
  onMarkAvoided: (item: AvoidedItem) => void;
  onDelete: (item: AvoidedItem) => void;
};

export function AvoidedRow({ item, onEdit, onMarkAvoided, onDelete }: AvoidedRowProps) {
  const title = item.note ?? item.categoryName ?? "Compra evitada";
  const details = [formatDate(item.date), item.note ? item.categoryName : null, reasonLabel(item.reason)].filter(
    Boolean,
  );
  const postponed = item.status === "postponed";

  const actions: ResourceAction[] = [
    { label: "Editar", onSelect: () => onEdit(item) },
    ...(postponed ? [{ label: "Marcar como evitada", onSelect: () => onMarkAvoided(item) }] : []),
    { label: "Eliminar", onSelect: () => onDelete(item), destructive: true },
  ];

  return (
    <ResourceCard
      icon={getCategoryIcon(item.categoryIcon)}
      title={title}
      subtitle={
        <>
          {postponed && <span className="font-semibold text-warning">Pospuesta · </span>}
          {details.join(" · ")}
        </>
      }
      value={formatPen(item.amountCents)}
      actions={actions}
      menuLabel={`Acciones de ${title} del ${formatDate(item.date)}`}
    />
  );
}
