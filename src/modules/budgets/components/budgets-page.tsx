"use client";

import { Copy, PiggyBank, Plus } from "lucide-react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorMessage } from "@/components/shared/error-message";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMonth } from "@/lib/dates";
import { formatPen } from "@/lib/money";

import { useBudgetsManager } from "../hooks/use-budgets-manager";
import { BudgetCard } from "./budget-card";
import { BudgetFormDialog } from "./budget-form-dialog";
import { BudgetsSummary } from "./budgets-summary";
import { MonthSwitcher } from "./month-switcher";
import { UnbudgetedList } from "./unbudgeted-list";

export function BudgetsPage() {
  const m = useBudgetsManager();

  const createButton = (
    <Button onClick={() => m.openCreate()} className="min-h-11 w-full sm:min-h-8 sm:w-auto">
      <Plus data-icon="inline-start" />
      Nuevo presupuesto
    </Button>
  );

  const copyButton = m.previousMonthHasBudgets && (
    <Button
      variant="outline"
      onClick={m.copyPrevious}
      disabled={m.isCopying}
      className="min-h-11 w-full sm:min-h-8 sm:w-auto"
    >
      <Copy data-icon="inline-start" />
      {m.isCopying ? "Copiando..." : "Copiar del mes anterior"}
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Análisis"
        description="Tus presupuestos del mes."
        action={createButton}
      />

      <MonthSwitcher
        month={m.month}
        isCurrentMonth={m.isCurrentMonth}
        onPrevious={m.previousMonth}
        onNext={m.nextMonth}
        onThisMonth={m.goToThisMonth}
      />

      {m.copyError && <ErrorMessage message={m.copyError} />}

      {m.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-[84px] rounded-xl" />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[110px] rounded-xl" />
          ))}
        </div>
      ) : m.loadError ? (
        <ErrorMessage message={m.loadError} onRetry={m.reload} />
      ) : (
        <div className="space-y-6" aria-busy={m.isFetching}>
          {m.items.length > 0 ? (
            <>
              <BudgetsSummary totals={m.totals} />
              <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {m.items.map((budget) => (
                  <BudgetCard
                    key={budget.id}
                    budget={budget}
                    onEdit={m.openEdit}
                    onDelete={m.askDelete}
                  />
                ))}
              </ul>
              {copyButton && <div>{copyButton}</div>}
            </>
          ) : (
            <EmptyState
              icon={PiggyBank}
              title={`Aún no tienes presupuestos en ${formatMonth(m.month)}`}
              description={
                m.previousMonthHasBudgets
                  ? "Copia los del mes anterior o crea uno nuevo."
                  : "Define cuánto quieres gastar por categoría y sigue tu avance."
              }
              action={
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  {copyButton}
                  {createButton}
                </div>
              }
            />
          )}

          <UnbudgetedList items={m.unbudgeted} onBudget={(categoryId) => m.openCreate(categoryId)} />

        </div>
      )}

      <BudgetFormDialog
        open={m.formState.mode !== "closed"}
        month={m.month}
        budget={m.formState.mode === "edit" ? m.formState.budget : undefined}
        presetCategoryId={m.formState.mode === "create" ? m.formState.presetCategoryId : undefined}
        budgetedCategoryIds={m.budgetedCategoryIds}
        onClose={m.closeForm}
      />

      <ConfirmDialog
        open={m.toDelete !== null}
        onOpenChange={(open) => !open && m.cancelDelete()}
        title="Eliminar presupuesto"
        description={
          m.toDelete
            ? `Se eliminará el presupuesto de ${m.toDelete.categoryName} de ${formatMonth(m.month)} (${formatPen(m.toDelete.amountCents)}). Tus gastos no cambian.`
            : ""
        }
        confirmLabel="Eliminar"
        destructive
        pending={m.isDeleting}
        error={m.deleteError}
        onConfirm={m.confirmDelete}
      />
    </div>
  );
}
