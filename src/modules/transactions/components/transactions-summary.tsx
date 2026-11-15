import { formatPen } from "@/lib/money";

import type { TransactionTotals } from "../types/transaction.types";

type SummaryItemProps = { label: string; value: string };

function SummaryItem({ label, value }: SummaryItemProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-card-foreground">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function TransactionsSummary({ totals }: { totals: TransactionTotals }) {
  const balance = totals.incomeCents - totals.expenseCents;

  return (
    <section aria-label="Resumen del período" className="grid gap-3 sm:grid-cols-3">
      <SummaryItem label="Ingresos" value={formatPen(totals.incomeCents)} />
      <SummaryItem label="Gastos" value={formatPen(totals.expenseCents)} />
      <SummaryItem label="Balance" value={formatPen(balance)} />
    </section>
  );
}
