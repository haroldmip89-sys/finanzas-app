"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { unwrapResult } from "@/lib/action-result";
import { accountsKey } from "@/modules/accounts/hooks/use-accounts";

import {
  createTransactionAction,
  deleteTransactionAction,
  updateTransactionAction,
} from "../actions/transactions.actions";
import type { TransactionInput } from "../schemas/transaction.schema";
import { transactionsKey } from "./use-transactions";

/** Transactions change account balances, so both lists are refreshed. */
function useInvalidate() {
  const client = useQueryClient();
  return async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: transactionsKey }),
      client.invalidateQueries({ queryKey: accountsKey }),
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
