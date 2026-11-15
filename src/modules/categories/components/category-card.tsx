import { Badge } from "@/components/ui/badge";
import { ResourceCard, type ResourceAction } from "@/components/shared/resource-card";

import type { Category } from "../types/category.types";
import { getCategoryIcon } from "./category-icon";

type CategoryCardProps = {
  category: Category;
  onEdit: (category: Category) => void;
  onToggleArchived: (category: Category) => void;
  onDelete: (category: Category) => void;
};

export function CategoryCard({
  category,
  onEdit,
  onToggleArchived,
  onDelete,
}: CategoryCardProps) {
  const archived = category.archivedAt !== null;

  const actions: ResourceAction[] = [
    { label: "Editar", onSelect: () => onEdit(category) },
    {
      label: archived ? "Desarchivar" : "Archivar",
      onSelect: () => onToggleArchived(category),
    },
    { label: "Eliminar", onSelect: () => onDelete(category), destructive: true },
  ];

  return (
    <ResourceCard
      icon={getCategoryIcon(category.icon)}
      title={category.name}
      badge={archived ? <Badge variant="secondary">Archivada</Badge> : undefined}
      archived={archived}
      actions={actions}
      menuLabel={`Acciones de ${category.name}`}
    />
  );
}
