import { SummaryTile } from "@/components/shared/summary-tile";
import { formatPen } from "@/lib/money";

import type { TransactionTotals } from "../types/transaction.types";

export function TransactionsSummary({ totals }: { totals: TransactionTotals }) {
  const balance = totals.incomeCents - totals.expenseCents;

  return (
    <section aria-label="Resumen del período" className="grid gap-3 sm:grid-cols-3">
      <SummaryTile label="Ingresos" value={formatPen(totals.incomeCents)} />
      <SummaryTile label="Gastos" value={formatPen(totals.expenseCents)} />
      <SummaryTile label="Balance" value={formatPen(balance)} />
      <p className="text-xs text-muted-foreground sm:col-span-3">
        Los ajustes de saldo no se cuentan en estos totales.
      </p>
    </section>
  );
}
