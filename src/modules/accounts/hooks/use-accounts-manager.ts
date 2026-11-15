"use client";

import { useState } from "react";

import { errorMessage } from "@/lib/action-result";

import { isCreditAccount, isLiquidAccount } from "../account-kind";
import { sumCardDebt, sumLiquidBalance } from "../card-summary";
import type { Account } from "../types/account.types";
import {
  useDeleteAccount,
  useSetAccountArchived,
} from "./use-account-mutations";
import { useAccounts } from "./use-accounts";
import { useCardSpending } from "./use-card-spending";

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

  const accounts = query.data ?? [];
  const cardAccounts = accounts.filter((a) => isCreditAccount(a.type));
  const regularAccounts = accounts.filter((a) => isLiquidAccount(a.type));
  // Only asked when there is a card: the figure means nothing without one.
  const hasActiveCards = cardAccounts.some((a) => a.archivedAt === null);
  const cardSpending = useCardSpending(hasActiveCards);

  return {
    accounts,
    regularAccounts,
    cardAccounts,
    liquidCents: sumLiquidBalance(accounts),
    debtCents: sumCardDebt(accounts),
    hasActiveCards,
    cardSpending: cardSpending.data,
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
