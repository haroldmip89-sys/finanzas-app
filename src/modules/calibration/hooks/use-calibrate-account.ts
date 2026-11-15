"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { unwrapResult } from "@/lib/action-result";
import { accountsKey } from "@/modules/accounts/hooks/use-accounts";
import { transactionsKey } from "@/modules/transactions/hooks/use-transactions";

import { calibrateAccountAction } from "../actions/calibration.actions";
import type { CalibrationInput } from "../schemas/calibration.schema";

/** Calibrating changes balances and adds a transaction: both lists refresh. */
export function useCalibrateAccount() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: CalibrationInput) =>
      unwrapResult(await calibrateAccountAction(input)),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: accountsKey }),
        client.invalidateQueries({ queryKey: transactionsKey }),
      ]);
    },
  });
}
