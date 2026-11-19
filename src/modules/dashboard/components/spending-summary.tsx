"use client";

import { ErrorMessage } from "@/components/shared/error-message";
import { formatPen } from "@/lib/money";
import { cn } from "@/lib/utils";
import { describeSpendingChange } from "@/modules/accounts/card-summary";

import { groupTopCategories } from "../dashboard-math";
import { useSpendingSummary } from "../hooks/use-spending-summary";
import { previousMonthName } from "../month-labels";
import { DashboardSection, SectionSkeleton } from "./dashboard-section";

const COLORS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];

/** Spending of the month so far, how it compares and where it went. */
export function SpendingSummary() {
  const query = useSpendingSummary();

  if (query.isPending) return <SectionSkeleton title="Gastos del mes" />;
  if (query.isError) {
    return (
      <ErrorMessage
        message="No pudimos cargar tus gastos. Tus datos están a salvo."
        onRetry={() => query.refetch()}
      />
    );
  }

  const { currentCents, previousCents, byCategory } = query.data;
  const change = describeSpendingChange(currentCents, previousCents);
  const month = previousMonthName();
  const shares = groupTopCategories(byCategory.map((c) => ({ name: c.name, cents: c.cents })));

  const note =
    change.kind === "none"
      ? "Aún no registras gastos este mes."
      : change.kind === "same"
        ? `Igual que a esta altura de ${month}`
        : change.kind === "more"
          ? `${formatPen(change.cents)} más que a esta altura de ${month}`
          : `${formatPen(change.cents)} menos que a esta altura de ${month}`;

  const description = shares.map((s) => `${s.name} ${formatPen(s.cents)}`).join(", ");

  return (
    <DashboardSection
      title="Gastos del mes"
      aside={<span className="text-[22px] leading-7 font-bold">{formatPen(currentCents)}</span>}
    >
      <p
        className={cn(
          "text-[13px]",
          change.kind === "less" ? "font-semibold text-success" : "text-muted-foreground",
        )}
      >
        {note}
      </p>

      {shares.length > 0 && (
        <>
          <div
            role="img"
            aria-label={`Gastos por categoría: ${description}`}
            className="flex h-3 gap-0.5 overflow-hidden rounded-full"
          >
            {shares.map((s, i) => (
              <span
                key={s.name}
                className={cn(s.isOther ? "bg-muted-foreground" : COLORS[i])}
                style={{ width: `${s.pct}%` }}
              />
            ))}
          </div>
          <ul className="space-y-2">
            {shares.map((s, i) => (
              <li key={s.name} className="flex items-center gap-2 text-sm">
                <span
                  aria-hidden="true"
                  className={cn("size-2.5 shrink-0 rounded-[3px]", s.isOther ? "bg-muted-foreground" : COLORS[i])}
                />
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{s.name}</span>
                <span className="font-semibold">{formatPen(s.cents)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </DashboardSection>
  );
}
