"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { unwrapResult } from "@/lib/action-result";
import { accountsKey } from "@/modules/accounts/hooks/use-accounts";

import {
  createTransferAction,
  deleteTransferAction,
  updateTransferAction,
} from "../actions/transfers.actions";
import type { TransferInput } from "../schemas/transfer.schema";
import { transfersKey } from "./use-transfers";

/** Transfers change account balances, so both lists are refreshed. */
function useInvalidate() {
  const client = useQueryClient();
  return async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: transfersKey }),
      client.invalidateQueries({ queryKey: accountsKey }),
    ]);
  };
}

export function useSaveTransfer() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: TransferInput }) =>
      unwrapResult(
        id ? await updateTransferAction(id, input) : await createTransferAction(input),
      ),
    onSuccess: invalidate,
  });
}

export function useDeleteTransfer() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => unwrapResult(await deleteTransferAction(id)),
    onSuccess: invalidate,
  });
}
