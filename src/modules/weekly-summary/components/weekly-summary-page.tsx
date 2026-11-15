"use client";

import { ErrorMessage } from "@/components/shared/error-message";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/dates";
import { formatPen } from "@/lib/money";
import { DashboardSection } from "@/modules/dashboard/components/dashboard-section";

import { useWeeklySummary } from "../hooks/use-weekly-summary";
import { availableChangeText, weekComparisonText } from "../weekly-text";

function signedPen(cents: number): string {
  return cents < 0 ? `−${formatPen(-cents)}` : formatPen(cents);
}

export function WeeklySummaryPage() {
  const query = useWeeklySummary();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resumen semanal"
        description={
          query.data
            ? `Del ${formatDate(query.data.from)} a hoy, ${formatDate(query.data.to)}.`
            : "Cómo va tu semana."
        }
      />

      {query.isPending ? (
        <div className="grid gap-4 md:grid-cols-2" aria-busy="true">
          <Skeleton className="h-36 rounded-[20px]" />
          <Skeleton className="h-36 rounded-[20px]" />
        </div>
      ) : query.isError ? (
        <ErrorMessage message="No pudimos cargar tu resumen." onRetry={() => query.refetch()} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <DashboardSection title="Gastado esta semana">
            <p className="text-[26px] leading-8 font-bold">{formatPen(query.data.spentCents)}</p>
            <p className="text-[13px] text-muted-foreground">
              {weekComparisonText(query.data.spentCents, query.data.previousSpentCents)}
            </p>
          </DashboardSection>

          <DashboardSection title="Dónde se fue">
            {query.data.byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin gastos esta semana.</p>
            ) : (
              <ul className="space-y-2">
                {query.data.byCategory.map((c) => (
                  <li key={c.categoryId} className="flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">{c.name}</span>
                    <span className="font-semibold tabular-nums">{formatPen(c.cents)}</span>
                  </li>
                ))}
              </ul>
            )}
          </DashboardSection>

          <DashboardSection title="Compras evitadas">
            <p className="text-[26px] leading-8 font-bold">
              {query.data.avoidedCount} {query.data.avoidedCount === 1 ? "compra" : "compras"}
            </p>
            <p className="text-[13px] text-muted-foreground">
              Valor estimado {formatPen(query.data.avoidedCents)}. No es dinero ahorrado real.
            </p>
          </DashboardSection>

          <DashboardSection title="Dinero disponible">
            <p className="text-[26px] leading-8 font-bold">{signedPen(query.data.availableNowCents)}</p>
            <p className="text-[13px] text-muted-foreground">
              {availableChangeText(query.data.availableAtStartCents, query.data.availableNowCents)}{" "}
              Estimado.
            </p>
          </DashboardSection>
        </div>
      )}
    </div>
  );
}
