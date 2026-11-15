"use client";

import { useState } from "react";

import { errorMessage } from "@/lib/action-result";
import { useAccounts } from "@/modules/accounts/hooks/use-accounts";

import type { TransferListItem } from "../types/transfer.types";
import { useDeleteTransfer } from "./use-transfer-mutations";
import { useTransferFilters } from "./use-transfer-filters";
import { useTransfers } from "./use-transfers";

type FormState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; transfer: TransferListItem };

const PAGE_SIZE = 20;

/** All UI state and handlers of the transfers page. */
export function useTransfersManager() {
  const filters = useTransferFilters(PAGE_SIZE);
  const [formState, setFormState] = useState<FormState>({ mode: "closed" });
  const [toDelete, setToDelete] = useState<TransferListItem | null>(null);

  const query = useTransfers(filters.query);
  const remove = useDeleteTransfer();

  // The account filter lists every account, archived ones included, so the
  // user can still look at old transfers.
  const accounts = useAccounts(true);
  const accountOptions = (accounts.data ?? []).map((a) => ({ id: a.id, name: a.name }));

  const page = query.data;
  const totalPages = page ? Math.max(1, Math.ceil(page.total / page.pageSize)) : 1;

  return {
    filters: filters.filters,
    setFilter: filters.setFilter,
    resetFilters: filters.reset,
    isFiltered: !filters.isDefault,
    accountOptions,

    items: page?.items ?? [],
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
    openEdit: (transfer: TransferListItem) => setFormState({ mode: "edit", transfer }),
    closeForm: () => setFormState({ mode: "closed" }),

    toDelete,
    askDelete: (transfer: TransferListItem) => {
      remove.reset();
      setToDelete(transfer);
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
