"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { unwrapResult } from "@/lib/action-result";
import { budgetsKey } from "@/lib/query-keys";
import { accountsKey } from "@/modules/accounts/hooks/use-accounts";

import {
  createTransactionAction,
  deleteTransactionAction,
  updateTransactionAction,
} from "../actions/transactions.actions";
import type { TransactionInput } from "../schemas/transaction.schema";
import { transactionsKey } from "./use-transactions";

/** Transactions change balances and budget spending: all of them refresh. */
function useInvalidate() {
  const client = useQueryClient();
  return async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: transactionsKey }),
      client.invalidateQueries({ queryKey: accountsKey }),
      // Budgets show what was spent, so a saved transaction changes them too.
      client.invalidateQueries({ queryKey: budgetsKey }),
    ]);
  };
}

export function useSaveTransaction() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: TransactionInput }) =>
      unwrapResult(
        id
          ? await updateTransactionAction(id, input)
          : await createTransactionAction(input),
      ),
    onSuccess: invalidate,
  });
}

export function useDeleteTransaction() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) =>
      unwrapResult(await deleteTransactionAction(id)),
    onSuccess: invalidate,
  });
}
