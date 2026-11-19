"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { unwrapResult } from "@/lib/action-result";

import { listAccountsAction } from "../actions/accounts.actions";

export const accountsKey = ["accounts"] as const;
export function useAccounts(includeArchived: boolean) {
  return useQuery({
    queryKey: [...accountsKey, { includeArchived }],
    queryFn: async () =>
      unwrapResult(await listAccountsAction({ includeArchived })),
    // Retain the last successful result if this query is re-run.
    placeholderData: keepPreviousData,
  });
}
