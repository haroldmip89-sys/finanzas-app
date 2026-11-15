import { Button } from "@/components/ui/button";
import { formatPen } from "@/lib/money";
import { CategoryIcon } from "@/modules/categories/components/category-icon";

import type { UnbudgetedItem } from "../types/budget.types";

type UnbudgetedListProps = {
  items: UnbudgetedItem[];
  onBudget: (categoryId: string) => void;
};

/** Categories with spending this month and no budget, with a shortcut to budget them. */
export function UnbudgetedList({ items, onBudget }: UnbudgetedListProps) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="unbudgeted-heading" className="space-y-3">
      <div className="space-y-1">
        <h2 id="unbudgeted-heading" className="text-lg font-semibold">
          Gastos sin presupuesto
        </h2>
        <p className="text-sm text-muted-foreground">
          Categorías con gasto este mes que aún no tienen presupuesto.
        </p>
      </div>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          return (
            <li
              key={item.categoryId}
              className="flex min-w-0 items-center gap-3 rounded-xl border border-dashed border-border p-4"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <CategoryIcon iconKey={item.categoryIcon} className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.categoryName}</p>
                <p className="truncate text-sm text-muted-foreground tabular-nums">
                  {formatPen(item.spentCents)} gastados
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 shrink-0 md:min-h-8"
                aria-label={`Presupuestar ${item.categoryName}`}
                onClick={() => onBudget(item.categoryId)}
              >
                Presupuestar
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
