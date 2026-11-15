import { SummaryTile } from "@/components/shared/summary-tile";
import { formatPen } from "@/lib/money";

import { describeSpendingChange } from "../card-summary";

function changeNote(current: number, previous: number): string {
  const change = describeSpendingChange(current, previous);
  switch (change.kind) {
    case "none":
      return "Sin compras con tarjeta este ni el mes pasado";
    case "same":
      return "Igual que el mes pasado";
    case "more":
      return `${formatPen(change.cents)} más que el mes pasado`;
    case "less":
      return `${formatPen(change.cents)} menos que el mes pasado`;
  }
}

type AccountsSummaryProps = {
  liquidCents: number;
  debtCents: number;
  hasCards: boolean;
  cardSpending?: { currentMonthCents: number; previousMonthCents: number };
};

/** Money you can spend vs. what you owe on cards, and how much you buy with them. */
export function AccountsSummary({
  liquidCents,
  debtCents,
  hasCards,
  cardSpending,
}: AccountsSummaryProps) {
  return (
    <section
      aria-label="Resumen de cuentas"
      className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(14rem,1fr))]"
    >
      <SummaryTile label="Dinero líquido" value={formatPen(liquidCents)} />
      {hasCards && <SummaryTile label="Deuda de tarjetas" value={formatPen(debtCents)} />}
      {hasCards && cardSpending && (
        <SummaryTile
          label="Compras con tarjeta este mes"
          value={formatPen(cardSpending.currentMonthCents)}
          note={changeNote(cardSpending.currentMonthCents, cardSpending.previousMonthCents)}
        />
      )}
    </section>
  );
}
