"use client";

import Link from "next/link";

import { ErrorMessage } from "@/components/shared/error-message";
import { formatPen } from "@/lib/money";
import {
  DashboardSection,
  SectionSkeleton,
} from "@/modules/dashboard/components/dashboard-section";

import { useWeeklySummary } from "../hooks/use-weekly-summary";
import { weekComparisonText } from "../weekly-text";

/** Inicio card: this week's spending, with a way into the full summary. */
export function WeeklySummaryCard() {
  const query = useWeeklySummary();

  if (query.isPending) return <SectionSkeleton title="Tu semana" />;
  if (query.isError) {
    return (
      <ErrorMessage
        message="No pudimos cargar tu resumen semanal."
        onRetry={() => query.refetch()}
      />
    );
  }

  const { spentCents, previousSpentCents } = query.data;

  return (
    <DashboardSection
      title="Tu semana"
      aside={
        <Link href="/weekly" className="text-sm font-semibold text-primary">
          Ver resumen
        </Link>
      }
    >
      <p className="text-[26px] leading-8 font-bold">{formatPen(spentCents)}</p>
      <p className="text-[13px] text-muted-foreground">
        {weekComparisonText(spentCents, previousSpentCents)}
      </p>
    </DashboardSection>
  );
}
