"use client";

import { ActionFailure, errorMessage } from "@/lib/action-result";
import { centsToPen } from "@/lib/money";
import { useZodForm } from "@/hooks/use-zod-form";

import {
  accountFormSchema,
  toAccountInput,
  type AccountFormValues,
} from "../schemas/account.schema";
import type { Account } from "../types/account.types";
import { useSaveAccount } from "./use-account-mutations";

function defaultsFor(account?: Account): AccountFormValues {
  return {
    name: account?.name ?? "",
    type: account?.type ?? "cash",
    initialBalance: account ? centsToPen(account.initialBalanceCents) : "",
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
    onSubmit,
    submitError,
    isPending: save.isPending,
    isEditing: Boolean(account),
  };
}
