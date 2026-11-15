"use client";

import { useState } from "react";

import { errorMessage } from "@/lib/action-result";
import { useAccounts } from "@/modules/accounts/hooks/use-accounts";
import { useCategories } from "@/modules/categories/hooks/use-categories";

import type { TransactionListItem } from "../types/transaction.types";
import { useDeleteTransaction } from "./use-transaction-mutations";
import { useTransactionFilters } from "./use-transaction-filters";
import { useTransactions } from "./use-transactions";

type FormState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; transaction: TransactionListItem };

const PAGE_SIZE = 20;

/** All UI state and handlers of the transactions page. */
export function useTransactionsManager() {
  const filters = useTransactionFilters(PAGE_SIZE);
  const [formState, setFormState] = useState<FormState>({ mode: "closed" });
  const [toDelete, setToDelete] = useState<TransactionListItem | null>(null);

  const query = useTransactions(filters.query);
  const remove = useDeleteTransaction();

  // Filters list every account and category, archived ones included, so the
  // user can still look at old movements.
  const accounts = useAccounts(true);
  const categories = useCategories(true);

  const accountOptions = (accounts.data ?? []).map((a) => ({ id: a.id, name: a.name }));
  const categoryOptions = (categories.data ?? [])
    .filter((c) => !filters.filters.type || c.kind === filters.filters.type)
    .map((c) => ({ id: c.id, name: c.name }));

  const page = query.data;
  const totalPages = page ? Math.max(1, Math.ceil(page.total / page.pageSize)) : 1;

  return {
    filters: filters.filters,
    setFilter: filters.setFilter,
    resetFilters: filters.reset,
    isFiltered: !filters.isDefault,
    accountOptions,
    categoryOptions,

    items: page?.items ?? [],
    totals: page?.totals ?? { incomeCents: 0, expenseCents: 0 },
    total: page?.total ?? 0,
    page: filters.page,
    totalPages,
    setPage: filters.setPage,
    isLoading: query.isPending,
    isFetching: query.isFetching,
    loadError: query.isError ? errorMessage(query.error) : undefined,
    reload: () => query.refetch(),

    formState,
    openCreate: () => setFormState({ mode: "create" }),
    openEdit: (transaction: TransactionListItem) =>
      setFormState({ mode: "edit", transaction }),
    closeForm: () => setFormState({ mode: "closed" }),

    toDelete,
    askDelete: (transaction: TransactionListItem) => {
      remove.reset();
      setToDelete(transaction);
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
