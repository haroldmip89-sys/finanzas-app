"use client";

import { useState } from "react";
import { toast } from "sonner";

import { errorMessage } from "@/lib/action-result";
import { addMonths, currentMonthKey } from "@/lib/dates";

import type { BudgetListItem } from "../types/budget.types";
import { useCopyBudgets, useDeleteBudget } from "./use-budget-mutations";
import { useBudgets } from "./use-budgets";

type FormState =
  | { mode: "closed" }
  | { mode: "create"; presetCategoryId?: string }
  | { mode: "edit"; budget: BudgetListItem };

/** All UI state and handlers of the budgets (Análisis) page. */
export function useBudgetsManager() {
  const [month, setMonth] = useState(() => currentMonthKey());
  const [formState, setFormState] = useState<FormState>({ mode: "closed" });
  const [toDelete, setToDelete] = useState<BudgetListItem | null>(null);

  const query = useBudgets(month);
  const remove = useDeleteBudget();
  const copy = useCopyBudgets();

  const overview = query.data;
  const thisMonth = currentMonthKey();

  return {
    month,
    isCurrentMonth: month === thisMonth,
    previousMonth: () => setMonth((m) => addMonths(m, -1)),
    nextMonth: () => setMonth((m) => addMonths(m, 1)),
    goToThisMonth: () => setMonth(currentMonthKey()),

    items: overview?.items ?? [],
    unbudgeted: overview?.unbudgeted ?? [],
    totals: overview?.totals ?? { budgetedCents: 0, spentCents: 0, remainingCents: 0 },
    previousMonthHasBudgets: overview?.previousMonthHasBudgets ?? false,
    budgetedCategoryIds: (overview?.items ?? []).map((i) => i.categoryId),
    isLoading: query.isPending,
    isFetching: query.isFetching,
    loadError: query.isError ? errorMessage(query.error) : undefined,
    reload: () => query.refetch(),

    formState,
    openCreate: (presetCategoryId?: string) => setFormState({ mode: "create", presetCategoryId }),
    openEdit: (budget: BudgetListItem) => setFormState({ mode: "edit", budget }),
    closeForm: () => setFormState({ mode: "closed" }),

    copyPrevious: () => {
      copy.mutate(month, {
        onSuccess: ({ created }) =>
          toast.success(
            created === 0
              ? "No había nada nuevo que copiar."
              : created === 1
                ? "Se copió 1 presupuesto del mes anterior."
                : `Se copiaron ${created} presupuestos del mes anterior.`,
          ),
      });
    },
    isCopying: copy.isPending,
    copyError: copy.isError ? errorMessage(copy.error) : undefined,

    toDelete,
    askDelete: (budget: BudgetListItem) => {
      remove.reset();
      setToDelete(budget);
    },
    cancelDelete: () => setToDelete(null),
    confirmDelete: () => {
      if (!toDelete) return;
      remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) });
    },
    isDeleting: remove.isPending,
    deleteError: remove.isError ? errorMessage(remove.error) : undefined,
  };
}
