"use client";

import { toast } from "sonner";

import type { SelectOption } from "@/components/shared/entity-select";
import { useZodForm } from "@/hooks/use-zod-form";
import { ActionFailure, errorMessage } from "@/lib/action-result";
import { currentMonthKey } from "@/lib/dates";
import { useAccounts } from "@/modules/accounts/hooks/use-accounts";

import {
  installmentFormSchema,
  toInstallmentCreateInput,
  type InstallmentFormValues,
} from "../schemas/installment.schema";
import { useCreateInstallment } from "./use-installments";

export function useInstallmentForm({ onSuccess }: { onSuccess: () => void }) {
  const create = useCreateInstallment();
  const accountsQuery = useAccounts(false);

  const cardOptions: SelectOption[] = (accountsQuery.data ?? [])
    .filter((a) => a.type === "card")
    .map((a) => ({ id: a.id, name: a.name }));

  const defaults: InstallmentFormValues = {
    accountId: cardOptions.length === 1 ? cardOptions[0].id : "",
    name: "",
    principal: "",
    count: "",
    installment: "",
    firstDueMonth: currentMonthKey(),
  };
  const { form, applyServerError, submitError } = useZodForm(installmentFormSchema, defaults);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await create.mutateAsync(toInstallmentCreateInput(values));
    } catch (error) {
      applyServerError({
        message: errorMessage(error),
        fieldErrors: error instanceof ActionFailure ? error.fieldErrors : undefined,
      });
      return;
    }
    toast.success(`Plan de cuotas guardado · ${values.name}`);
    onSuccess();
  });

  return {
    form,
    cardOptions,
    isLoadingOptions: accountsQuery.isPending,
    hasNoCards: !accountsQuery.isPending && cardOptions.length === 0,
    onSubmit,
    submitError,
    isPending: create.isPending,
  };
}
