"use client";

import { toast } from "sonner";

import { ActionFailure, errorMessage } from "@/lib/action-result";
import { todayInLima } from "@/lib/dates";
import { centsToPen, formatPen } from "@/lib/money";
import { useZodForm } from "@/hooks/use-zod-form";
import type { SelectOption } from "@/components/shared/entity-select";
import { useAccounts } from "@/modules/accounts/hooks/use-accounts";

import {
  toTransferInput,
  transferFormSchema,
  type TransferFormValues,
} from "../schemas/transfer.schema";
import type { TransferListItem } from "../types/transfer.types";
import { useSaveTransfer } from "./use-transfer-mutations";

function defaultsFor(transfer?: TransferListItem): TransferFormValues {
  if (!transfer) {
    return {
      fromAccountId: "",
      toAccountId: "",
      amount: "",
      date: todayInLima(),
      note: "",
    };
  }
  return {
    fromAccountId: transfer.fromAccountId,
    toAccountId: transfer.toAccountId,
    amount: centsToPen(transfer.amountCents),
    date: transfer.date,
    note: transfer.note ?? "",
  };
}

type Options = { transfer?: TransferListItem; onSuccess: () => void };

export function useTransferForm({ transfer, onSuccess }: Options) {
  const save = useSaveTransfer();
  const accountsQuery = useAccounts(false);
  const { form, applyServerError, submitError } = useZodForm(
    transferFormSchema,
    defaultsFor(transfer),
  );
  const fromAccountId = form.watch("fromAccountId");

  // Active accounts, plus the ones already used when editing (they may be archived).
  const activeOptions: SelectOption[] = (accountsQuery.data ?? []).map((a) => ({
    id: a.id,
    name: a.name,
  }));
  const withCurrent = (current: SelectOption | undefined) =>
    current && !activeOptions.some((a) => a.id === current.id)
      ? [...activeOptions, current]
      : activeOptions;

  const fromOptions = withCurrent(
    transfer && { id: transfer.fromAccountId, name: transfer.fromAccountName },
  );
  // The destination cannot be the origin.
  const toOptions = withCurrent(
    transfer && { id: transfer.toAccountId, name: transfer.toAccountName },
  ).filter((a) => a.id !== fromAccountId);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const input = toTransferInput(values);
      await save.mutateAsync({ id: transfer?.id, input });
      toast.success(
        `${transfer ? "Transferencia actualizada" : "Transferencia guardada"} · ${formatPen(input.amountCents)}`,
      );
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
    fromOptions,
    toOptions,
    isLoadingOptions: accountsQuery.isPending,
    // A transfer needs at least two accounts (the current ones count when editing).
    needsMoreAccounts: !accountsQuery.isPending && !transfer && activeOptions.length < 2,
    // Choosing the current destination as the new origin clears the destination.
    changeFrom: (id: string) => {
      form.setValue("fromAccountId", id, { shouldValidate: form.formState.isSubmitted });
      if (form.getValues("toAccountId") === id) form.setValue("toAccountId", "");
    },
    onSubmit,
    submitError,
    isPending: save.isPending,
    isEditing: Boolean(transfer),
  };
}
