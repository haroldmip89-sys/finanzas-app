import { SummaryTile } from "@/components/shared/summary-tile";
import { formatPen } from "@/lib/money";

import type { BudgetTotals } from "../types/budget.types";

export function BudgetsSummary({ totals }: { totals: BudgetTotals }) {
  const over = totals.remainingCents < 0;

  return (
    <section aria-label="Resumen del mes" className="grid gap-3 sm:grid-cols-3">
      <SummaryTile label="Presupuestado" value={formatPen(totals.budgetedCents)} />
      <SummaryTile label="Gastado" value={formatPen(totals.spentCents)} />
      <SummaryTile
        label={over ? "Excedido" : "Restante"}
        value={formatPen(Math.abs(totals.remainingCents))}
        note={over ? "Gastaste más de lo presupuestado en estas categorías" : undefined}
      />
    </section>
  );
}
