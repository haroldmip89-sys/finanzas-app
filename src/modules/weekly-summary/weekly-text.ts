import { describeSpendingChange } from "@/modules/accounts/card-summary";
import { formatPen } from "@/lib/money";

/** Neutral sentence comparing this week's spending with last week's. */
export function weekComparisonText(spentCents: number, previousCents: number): string {
  const change = describeSpendingChange(spentCents, previousCents);
  switch (change.kind) {
    case "none":
      return "Aún no registras gastos esta semana.";
    case "same":
      return "Igual que a esta altura de la semana pasada.";
    case "more":
      return `${formatPen(change.cents)} más que a esta altura de la semana pasada.`;
    case "less":
      return `${formatPen(change.cents)} menos que a esta altura de la semana pasada.`;
  }
}

/** How the available money moved during the week, in words. */
export function availableChangeText(startCents: number, nowCents: number): string {
  const diff = nowCents - startCents;
  if (diff === 0) return "Tu dinero disponible sigue igual que al empezar la semana.";
  const amount = formatPen(Math.abs(diff));
  return diff > 0
    ? `Tu dinero disponible subió ${amount} desde el lunes.`
    : `Tu dinero disponible bajó ${amount} desde el lunes.`;
}
