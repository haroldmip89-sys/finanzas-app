"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { ActionFailure, errorMessage } from "@/lib/action-result";
import { formatPen } from "@/lib/money";
import { useZodForm } from "@/hooks/use-zod-form";
import type { SelectOption } from "@/components/shared/entity-select";
import { useAccounts } from "@/modules/accounts/hooks/use-accounts";

import { getCalibrationPreview } from "../calibration-preview";
import {
  calibrationFormSchema,
  toCalibrationInput,
  type CalibrationFormValues,
} from "../schemas/calibration.schema";
import { useCalibrateAccount } from "./use-calibrate-account";

type Options = {
  /** Account fixed by the caller (e.g. the card it was opened from). */
  accountId?: string;
  onSuccess: () => void;
};

export function useCalibrationForm({ accountId, onSuccess }: Options) {
  const calibrate = useCalibrateAccount();
  const accountsQuery = useAccounts(false);
  const defaults: CalibrationFormValues = { accountId: accountId ?? "", realBalance: "" };
  const { form, applyServerError, submitError } = useZodForm(calibrationFormSchema, defaults);

  const selectedId = form.watch("accountId");
  const realBalance = form.watch("realBalance");
  const accounts = accountsQuery.data ?? [];
  const selected = accounts.find((a) => a.id === selectedId);

  // With a single account there is nothing to choose: preselect it once.
  const preselected = useRef(false);
  useEffect(() => {
    if (accountId || preselected.current || !accountsQuery.data) return;
    preselected.current = true;
    if (accountsQuery.data.length === 1 && !form.getValues("accountId")) {
      form.setValue("accountId", accountsQuery.data[0].id);
    }
  }, [accountId, accountsQuery.data, form]);

  const accountOptions: SelectOption[] = accounts.map((a) => ({ id: a.id, name: a.name }));
  const currentBalanceCents = selected ? selected.balanceCents : null;
  const preview = getCalibrationPreview(currentBalanceCents, realBalance);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await calibrate.mutateAsync(toCalibrationInput(values));
      toast.success(`Saldo calibrado · ${result.accountName}: ${formatPen(result.newBalanceCents)}`);
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
    accountOptions,
    selectedAccountName: selected?.name,
    currentBalanceCents,
    preview,
    // Nothing to do when the balance already matches or is not valid yet.
    canSubmit: preview.kind === "income" || preview.kind === "expense",
    isLoadingOptions: accountsQuery.isPending,
    hasNoAccounts: !accountsQuery.isPending && accounts.length === 0,
    accountFixed: Boolean(accountId),
    onSubmit,
    submitError,
    isPending: calibrate.isPending,
  };
}
