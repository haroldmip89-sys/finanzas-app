"use client";

import { useState } from "react";
import { toast } from "sonner";

import { errorMessage } from "@/lib/action-result";
import { addMonths, currentMonthKey } from "@/lib/dates";
import { formatPen } from "@/lib/money";

import type { AvoidedItem } from "../types/avoided.types";
import { useDeleteAvoided, useSetAvoidedStatus } from "./use-avoided-mutations";
import { useAvoided } from "./use-avoided";

type FormState = { mode: "closed" } | { mode: "create" } | { mode: "edit"; item: AvoidedItem };

/** All UI state and handlers of the avoided purchases page. */
export function useAvoidedManager() {
  const [month, setMonth] = useState(() => currentMonthKey());
  const [formState, setFormState] = useState<FormState>({ mode: "closed" });
  const [toDelete, setToDelete] = useState<AvoidedItem | null>(null);

  const query = useAvoided(month);
  const remove = useDeleteAvoided();
  const setStatus = useSetAvoidedStatus();

  const overview = query.data;

  return {
    month,
    isCurrentMonth: month === currentMonthKey(),
    previousMonth: () => setMonth((m) => addMonths(m, -1)),
    nextMonth: () => setMonth((m) => addMonths(m, 1)),
    goToThisMonth: () => setMonth(currentMonthKey()),

    items: overview?.items ?? [],
    totals: overview?.totals ?? { avoidedCount: 0, avoidedCents: 0, postponedCount: 0, postponedCents: 0 },
    byCategory: overview?.byCategory ?? [],
    previous: overview?.previous ?? { count: 0, cents: 0 },
    isLoading: query.isPending,
    isFetching: query.isFetching,
    loadError: query.isError ? errorMessage(query.error) : undefined,
    reload: () => query.refetch(),

    formState,
    openCreate: () => setFormState({ mode: "create" }),
    openEdit: (item: AvoidedItem) => setFormState({ mode: "edit", item }),
    closeForm: () => setFormState({ mode: "closed" }),

    markAvoided: (item: AvoidedItem) => {
      setStatus.mutate(
        { id: item.id, status: "avoided" },
        { onSuccess: () => toast.success(`Compra evitada · ${formatPen(item.amountCents)}`) },
      );
    },
    statusError: setStatus.isError ? errorMessage(setStatus.error) : undefined,

    toDelete,
    askDelete: (item: AvoidedItem) => {
      remove.reset();
      setToDelete(item);
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
