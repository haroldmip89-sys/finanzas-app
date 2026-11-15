"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { ActionFailure, errorMessage } from "@/lib/action-result";
import { todayInLima } from "@/lib/dates";
import { centsToPen, formatPen } from "@/lib/money";
import { useZodForm } from "@/hooks/use-zod-form";
import type { SelectOption } from "@/components/shared/entity-select";
import { isLiquidAccount } from "@/modules/accounts/account-kind";
import { getDebtCents } from "@/modules/accounts/card-summary";
import { useAccounts } from "@/modules/accounts/hooks/use-accounts";

import {
  toTransferInput,
  transferFormSchema,
  type TransferFormValues,
} from "../schemas/transfer.schema";
import type { TransferListItem } from "../types/transfer.types";
import { useSaveTransfer } from "./use-transfer-mutations";

function defaultsFor(transfer?: TransferListItem, payCardId?: string): TransferFormValues {
  if (!transfer) {
    return {
      fromAccountId: "",
      toAccountId: payCardId ?? "",
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

type Options = {
  transfer?: TransferListItem;
  /** Pays this card: it is the fixed destination and the amount defaults to its debt. */
  payCardId?: string;
  onSuccess: () => void;
};

export function useTransferForm({ transfer, payCardId, onSuccess }: Options) {
  const save = useSaveTransfer();
  const accountsQuery = useAccounts(false);
  const { form, applyServerError, submitError } = useZodForm(
    transferFormSchema,
    defaultsFor(transfer, payCardId),
  );
  const fromAccountId = form.watch("fromAccountId");
  const accounts = accountsQuery.data ?? [];
  const card = payCardId ? accounts.find((a) => a.id === payCardId) : undefined;

  // Paying a card: suggest its whole debt once the accounts are known. It never
  // overrides what the user typed.
  const amountSuggested = useRef(false);
  useEffect(() => {
    if (!payCardId || amountSuggested.current || !accountsQuery.data) return;
    amountSuggested.current = true;
    const target = accountsQuery.data.find((a) => a.id === payCardId);
    const debt = target ? getDebtCents(target.balanceCents) : 0;
    if (debt > 0 && !form.getValues("amount")) form.setValue("amount", centsToPen(debt));
  }, [payCardId, accountsQuery.data, form]);

  // Active accounts, plus the ones already used when editing (they may be archived).
  const activeOptions: SelectOption[] = (accountsQuery.data ?? []).map((a) => ({
    id: a.id,
    name: a.name,
  }));
  const withCurrent = (current: SelectOption | undefined) =>
    current && !activeOptions.some((a) => a.id === current.id)
      ? [...activeOptions, current]
      : activeOptions;

  // A card is paid from liquid accounts only, and the destination is the card.
  const liquidOptions: SelectOption[] = accounts
    .filter((a) => isLiquidAccount(a.type))
    .map((a) => ({ id: a.id, name: a.name }));
  const fromOptions = payCardId
    ? liquidOptions
    : withCurrent(transfer && { id: transfer.fromAccountId, name: transfer.fromAccountName });
  // The destination cannot be the origin.
  const toOptions = payCardId
    ? card
      ? [{ id: card.id, name: card.name }]
      : []
    : withCurrent(transfer && { id: transfer.toAccountId, name: transfer.toAccountName }).filter(
        (a) => a.id !== fromAccountId,
      );

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const input = toTransferInput(values);
      await save.mutateAsync({ id: transfer?.id, input });
      const label = payCardId
        ? "Pago de tarjeta guardado"
        : transfer
          ? "Transferencia actualizada"
          : "Transferencia guardada";
      toast.success(`${label} · ${formatPen(input.amountCents)}`);
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
    isPayingCard: Boolean(payCardId),
    destinationName: card?.name,
    // The card to pay is missing or archived (it cannot be paid).
    cardUnavailable: Boolean(payCardId) && !accountsQuery.isPending && !card,
    // A transfer needs at least two accounts (the current ones count when editing);
    // paying a card needs at least one liquid account.
    needsMoreAccounts:
      !accountsQuery.isPending &&
      !transfer &&
      (payCardId ? liquidOptions.length < 1 : activeOptions.length < 2),
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
