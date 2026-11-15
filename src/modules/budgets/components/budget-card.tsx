import { ActionsMenu, type ResourceAction } from "@/components/shared/actions-menu";
import { ProgressBar } from "@/components/shared/progress-bar";
import { formatPen } from "@/lib/money";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/modules/categories/components/category-icon";

import { getBudgetStatus, type BudgetState } from "../budget-status";
import type { BudgetListItem } from "../types/budget.types";

type BudgetCardProps = {
  budget: BudgetListItem;
  onEdit: (budget: BudgetListItem) => void;
  onDelete: (budget: BudgetListItem) => void;
};

/** Neutral wording: the state is said in text, never only with color. */
function statusText(state: BudgetState, remainingCents: number): string {
  switch (state) {
    case "ok":
      return `Te quedan ${formatPen(remainingCents)}`;
    case "near":
      return `Cerca del límite · te quedan ${formatPen(remainingCents)}`;
    case "over":
      return `Excedido por ${formatPen(-remainingCents)}`;
  }
}

export function BudgetCard({ budget, onEdit, onDelete }: BudgetCardProps) {
  const status = getBudgetStatus(budget.amountCents, budget.spentCents);
  const actions: ResourceAction[] = [
    { label: "Editar", onSelect: () => onEdit(budget) },
    { label: "Eliminar", onSelect: () => onDelete(budget), destructive: true },
  ];

  return (
    // min-w-0: grid item that must shrink below its text so `truncate` applies.
    <li className="min-w-0 space-y-3 rounded-xl border border-border bg-card p-4 text-card-foreground">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <CategoryIcon iconKey={budget.categoryIcon} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{budget.categoryName}</p>
          <p className="truncate text-sm text-muted-foreground tabular-nums">
            {formatPen(budget.spentCents)} de {formatPen(budget.amountCents)}
          </p>
        </div>
        <ActionsMenu actions={actions} label={`Acciones del presupuesto de ${budget.categoryName}`} />
      </div>
      <ProgressBar
        value={status.barPercent}
        tone={status.state === "over" ? "over" : "default"}
        label={`${budget.categoryName}: ${status.percent} % del presupuesto`}
      />
      <p
        className={cn(
          "text-sm",
          status.state === "over" ? "font-medium text-destructive" : "text-muted-foreground",
        )}
      >
        {statusText(status.state, status.remainingCents)}
      </p>
    </li>
  );
}
