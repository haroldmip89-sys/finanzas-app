"use client";

import Link from "next/link";

import { ErrorMessage } from "@/components/shared/error-message";
import { ProgressBar } from "@/components/shared/progress-bar";
import { buttonVariants } from "@/components/ui/button";
import { currentMonthKey } from "@/lib/dates";
import { formatPen } from "@/lib/money";
import { getBudgetStatus } from "@/modules/budgets/budget-status";
import { useBudgets } from "@/modules/budgets/hooks/use-budgets";

import { DashboardSection, SectionSkeleton } from "./dashboard-section";

const STATE = {
  ok: { label: "Holgado", tone: "success" },
  near: { label: "Cerca del límite", tone: "warning" },
  over: { label: "Excedido", tone: "over" },
} as const;

/** What is left of this month's budgets, with a way into the budgets page. */
export function BudgetSummary() {
  const query = useBudgets(currentMonthKey());

  if (query.isPending) return <SectionSkeleton title="Presupuesto restante" />;
  if (query.isError) {
    return (
      <ErrorMessage
        message="No pudimos cargar tus presupuestos. Tus datos están a salvo."
        onRetry={() => query.refetch()}
      />
    );
  }

  const { items, totals } = query.data;

  if (items.length === 0) {
    return (
      <DashboardSection title="Presupuesto restante">
        <p className="text-sm text-muted-foreground">
          Aún no tienes presupuestos este mes. Ponle un límite a tus categorías para saber cuánto te queda.
        </p>
        <Link href="/analysis" className={buttonVariants({ variant: "outline" })}>
          Crear presupuesto
        </Link>
      </DashboardSection>
    );
  }

  const status = getBudgetStatus(totals.budgetedCents, totals.spentCents);
  const over = status.remainingCents < 0;
  const state = STATE[status.state];

  return (
    <DashboardSection
      title="Presupuesto restante"
      aside={
        <Link href="/analysis" className="text-sm font-semibold text-primary">
          Ver presupuestos
        </Link>
      }
    >
      <p className="text-[26px] leading-8 font-bold">
        {over ? `Excedido por ${formatPen(-status.remainingCents)}` : formatPen(status.remainingCents)}
      </p>
      <ProgressBar
        value={status.barPercent}
        tone={state.tone}
        label={`Presupuesto del mes: ${status.percent} % usado`}
      />
      <p className="text-[13px] text-muted-foreground">
        {status.percent} % de {formatPen(totals.budgetedCents)} · {state.label}
      </p>
    </DashboardSection>
  );
}
