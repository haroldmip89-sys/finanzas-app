"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { unwrapResult } from "@/lib/action-result";

import {
  createAccountAction,
  deleteAccountAction,
  setAccountArchivedAction,
  updateAccountAction,
} from "../actions/accounts.actions";
import type { AccountInput } from "../schemas/account.schema";
import { accountsKey } from "./use-accounts";

function useInvalidateAccounts() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: accountsKey });
}

export function useSaveAccount() {
  const invalidate = useInvalidateAccounts();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: AccountInput }) =>
      unwrapResult(
        id ? await updateAccountAction(id, input) : await createAccountAction(input),
      ),
    onSuccess: invalidate,
  });
}

export function useSetAccountArchived() {
  const invalidate = useInvalidateAccounts();
  return useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) =>
      unwrapResult(await setAccountArchivedAction(id, archived)),
    onSuccess: invalidate,
  });
}

export function useDeleteAccount() {
  const invalidate = useInvalidateAccounts();
  return useMutation({
    mutationFn: async (id: string) => unwrapResult(await deleteAccountAction(id)),
    onSuccess: invalidate,
  });
}
