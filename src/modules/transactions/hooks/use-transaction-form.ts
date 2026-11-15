"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ActionFailure, errorMessage } from "@/lib/action-result";
import { todayInLima } from "@/lib/dates";
import { centsToPen, formatPen, penToCents } from "@/lib/money";
import { useLastAccount } from "@/hooks/use-last-account";
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
import { useFrequentCategories } from "./use-frequent-categories";
import { useSaveTransaction } from "./use-transaction-mutations";

export type SelectOption = { id: string; name: string; icon?: string | null };

function defaultsFor(
  transaction: TransactionListItem | undefined,
  defaultType: TransactionType,
): TransactionFormValues {
  if (!transaction) {
    return {
      type: defaultType,
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

type Options = {
  transaction?: TransactionListItem;
  /** Type preselected when creating. */
  defaultType?: TransactionType;
  onSuccess: () => void;
};

export function useTransactionForm({
  transaction,
  defaultType = "expense",
  onSuccess,
}: Options) {
  const save = useSaveTransaction();
  const accountsQuery = useAccounts(false);
  const categoriesQuery = useCategories(false);
  const { lastAccountId, saveLastAccount } = useLastAccount();
  const [showAllCategories, setShowAllCategories] = useState(false);
  const { form, applyServerError, submitError } = useZodForm(
    transactionFormSchema,
    defaultsFor(transaction, defaultType),
  );
  const type = form.watch("type");
  const frequentQuery = useFrequentCategories(type);

  // Preselect the account once the list is known: the last one used if it is
  // still active, or the only one there is. Never overrides a later choice.
  const accountPreselected = useRef(false);
  useEffect(() => {
    if (transaction || accountPreselected.current || !accountsQuery.data) return;
    accountPreselected.current = true;
    const active = accountsQuery.data;
    const remembered = active.find((a) => a.id === lastAccountId);
    const choice = remembered ?? (active.length === 1 ? active[0] : undefined);
    if (choice && !form.getValues("accountId")) form.setValue("accountId", choice.id);
  }, [transaction, accountsQuery.data, lastAccountId, form]);

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

  const frequentCategories = frequentQuery.data ?? [];

  const submit = (addAnother: boolean) =>
    form.handleSubmit(async (values) => {
      try {
        await save.mutateAsync({ id: transaction?.id, input: toTransactionInput(values) });
      } catch (error) {
        applyServerError({
          message: errorMessage(error),
          fieldErrors: error instanceof ActionFailure ? error.fieldErrors : undefined,
        });
        return;
      }

      saveLastAccount(values.accountId);
      const amount = formatPen(penToCents(values.amount) ?? 0);
      if (transaction) {
        toast.success(`Transacción actualizada · ${amount}`);
      } else {
        toast.success(
          `${values.type === "expense" ? "Gasto" : "Ingreso"} guardado · ${amount}`,
        );
      }

      if (addAnother) {
        // Ready for the next one: keep type, account and date.
        form.reset({
          type: values.type,
          accountId: values.accountId,
          categoryId: "",
          amount: "",
          date: values.date,
          note: "",
        });
        form.setFocus("amount");
      } else {
        onSuccess();
      }
    });

  return {
    form,
    type,
    accountOptions,
    categoryOptions,
    frequentCategories,
    // Chips are for quick creation; editing keeps the full select.
    showChips: !transaction && !showAllCategories && frequentCategories.length > 0,
    showAllCategories: () => setShowAllCategories(true),
    isLoadingOptions: accountsQuery.isPending || categoriesQuery.isPending,
    hasNoAccounts: !accountsQuery.isPending && accountOptions.length === 0,
    // Changing the type invalidates the chosen category.
    changeType: (next: TransactionType) => {
      form.setValue("type", next);
      form.setValue("categoryId", "");
    },
    onSubmit: submit(false),
    onSubmitAndAddAnother: submit(true),
    submitError,
    isPending: save.isPending,
    isEditing: Boolean(transaction),
  };
}
