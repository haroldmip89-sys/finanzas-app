import { cn } from "@/lib/utils";
import { getCategoryIcon } from "@/modules/categories/components/category-icon";

import type { FrequentCategory } from "../types/transaction.types";

type CategoryChipsProps = {
  categories: FrequentCategory[];
  value: string;
  onChange: (id: string) => void;
  onShowAll: () => void;
};

/** Most used categories as one-tap buttons, plus "Más" for the full list. */
export function CategoryChips({
  categories,
  value,
  onChange,
  onShowAll,
}: CategoryChipsProps) {
  return (
    <div role="radiogroup" aria-label="Categorías más usadas" className="grid grid-cols-2 gap-2">
      {categories.map((category) => {
        const Icon = getCategoryIcon(category.icon);
        const selected = category.id === value;
        return (
          <button
            key={category.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(category.id)}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-lg border px-3 text-left text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-card-foreground hover:bg-muted",
            )}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            <span className="truncate">{category.name}</span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={onShowAll}
        className="flex min-h-11 items-center justify-center rounded-lg border border-dashed border-border px-3 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        Más…
      </button>
    </div>
  );
}
