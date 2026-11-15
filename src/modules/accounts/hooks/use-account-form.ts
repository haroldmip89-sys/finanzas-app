"use client";

import { ActionFailure, errorMessage } from "@/lib/action-result";
import { useZodForm } from "@/hooks/use-zod-form";

import { isCreditAccount } from "../account-kind";
import {
  accountFormSchema,
  balanceToFormValue,
  toAccountInput,
  type AccountFormValues,
} from "../schemas/account.schema";
import type { Account } from "../types/account.types";
import { useSaveAccount } from "./use-account-mutations";

function defaultsFor(account?: Account): AccountFormValues {
  return {
    name: account?.name ?? "",
    type: account?.type ?? "cash",
    initialBalance: account ? balanceToFormValue(account.type, account.initialBalanceCents) : "",
    includeInAvailable: account?.includeInAvailable ?? true,
  };
}

type Options = { account?: Account; onSuccess: () => void };

export function useAccountForm({ account, onSuccess }: Options) {
  const save = useSaveAccount();
  const { form, applyServerError, submitError } = useZodForm(
    accountFormSchema,
    defaultsFor(account),
  );

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync({ id: account?.id, input: toAccountInput(values) });
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
    // A card's balance is a debt: the form asks for "Deuda" instead of a balance.
    isCard: isCreditAccount(form.watch("type")),
    onSubmit,
    submitError,
    isPending: save.isPending,
    isEditing: Boolean(account),
  };
}
