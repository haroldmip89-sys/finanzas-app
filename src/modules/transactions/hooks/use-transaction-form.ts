"use client";

import { ActionFailure, errorMessage } from "@/lib/action-result";
import { todayInLima } from "@/lib/dates";
import { centsToPen } from "@/lib/money";
import { useZodForm } from "@/hooks/use-zod-form";
import { useAccounts } from "@/modules/accounts/hooks/use-accounts";
import { useCategories } from "@/modules/categories/hooks/use-categories";

import {
  toTransactionInput,
  transactionFormSchema,
  type TransactionFormValues,
} from "../schemas/transaction.schema";
import type {
  TransactionListItem,
  TransactionType,
} from "../types/transaction.types";
import { useSaveTransaction } from "./use-transaction-mutations";

export type SelectOption = { id: string; name: string; icon?: string | null };

function defaultsFor(transaction?: TransactionListItem): TransactionFormValues {
  if (!transaction) {
    return {
      type: "expense",
      accountId: "",
      categoryId: "",
      amount: "",
      date: todayInLima(),
      note: "",
    };
  }
  return {
    type: transaction.type,
    accountId: transaction.accountId,
    categoryId: transaction.categoryId,
    amount: centsToPen(transaction.amountCents),
    date: transaction.date,
    note: transaction.note ?? "",
  };
}

type Options = { transaction?: TransactionListItem; onSuccess: () => void };

export function useTransactionForm({ transaction, onSuccess }: Options) {
  const save = useSaveTransaction();
  const accountsQuery = useAccounts(false);
  const categoriesQuery = useCategories(false);
  const { form, applyServerError, submitError } = useZodForm(
    transactionFormSchema,
    defaultsFor(transaction),
  );
  const type = form.watch("type");

  // Active accounts, plus the one already used when editing (it may be archived).
  const accountOptions: SelectOption[] = (accountsQuery.data ?? []).map((a) => ({
    id: a.id,
    name: a.name,
  }));
  if (transaction && !accountOptions.some((a) => a.id === transaction.accountId)) {
    accountOptions.push({ id: transaction.accountId, name: transaction.accountName });
  }

  // Only categories of the chosen type, plus the current one when it still matches.
  const categoryOptions: SelectOption[] = (categoriesQuery.data ?? [])
    .filter((c) => c.kind === type)
    .map((c) => ({ id: c.id, name: c.name, icon: c.icon }));
  if (
    transaction &&
    transaction.type === type &&
    !categoryOptions.some((c) => c.id === transaction.categoryId)
  ) {
    categoryOptions.push({
      id: transaction.categoryId,
      name: transaction.categoryName,
      icon: transaction.categoryIcon,
    });
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync({ id: transaction?.id, input: toTransactionInput(values) });
      onSuccess();
    } catch (error) {
      applyServerError({
        message: errorMessage(error),
        fieldErrors: error instanceof ActionFailure ? error.fieldErrors : undefined,
      });
    }
  });

  return {
    form,
    type,
    accountOptions,
    categoryOptions,
    isLoadingOptions: accountsQuery.isPending || categoriesQuery.isPending,
    hasNoAccounts: !accountsQuery.isPending && accountOptions.length === 0,
    // Changing the type invalidates the chosen category.
    changeType: (next: TransactionType) => {
      form.setValue("type", next);
      form.setValue("categoryId", "");
    },
    onSubmit,
    submitError,
    isPending: save.isPending,
    isEditing: Boolean(transaction),
  };
}
