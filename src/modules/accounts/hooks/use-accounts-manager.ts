"use client";

import { useState } from "react";

import { errorMessage } from "@/lib/action-result";

import type { Account } from "../types/account.types";
import {
  useDeleteAccount,
  useSetAccountArchived,
} from "./use-account-mutations";
import { useAccounts } from "./use-accounts";

type FormState = { mode: "closed" } | { mode: "create" } | { mode: "edit"; account: Account };
type ConfirmState = { kind: "delete"; account: Account } | null;

/** All UI state and handlers of the accounts page. */
export function useAccountsManager() {
  const [showArchived, setShowArchived] = useState(false);
  const [formState, setFormState] = useState<FormState>({ mode: "closed" });
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const query = useAccounts(showArchived);
  const archive = useSetAccountArchived();
  const remove = useDeleteAccount();

  return {
    accounts: query.data ?? [],
    isLoading: query.isPending,
    loadError: query.isError ? errorMessage(query.error) : undefined,
    reload: () => query.refetch(),

    showArchived,
    setShowArchived,

    formState,
    openCreate: () => setFormState({ mode: "create" }),
    openEdit: (account: Account) => setFormState({ mode: "edit", account }),
    closeForm: () => setFormState({ mode: "closed" }),

    toggleArchived: (account: Account) =>
      archive.mutate({ id: account.id, archived: account.archivedAt === null }),
    archiveError: archive.isError ? errorMessage(archive.error) : undefined,

    confirm,
    askDelete: (account: Account) => {
      remove.reset();
      setConfirm({ kind: "delete", account });
    },
    cancelConfirm: () => setConfirm(null),
    confirmDelete: () => {
      if (!confirm) return;
      remove.mutate(confirm.account.id, { onSuccess: () => setConfirm(null) });
    },
    isDeleting: remove.isPending,
    deleteError: remove.isError ? errorMessage(remove.error) : undefined,
  };
}
