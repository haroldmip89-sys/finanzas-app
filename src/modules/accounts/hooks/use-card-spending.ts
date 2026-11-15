"use client";

import { useQuery } from "@tanstack/react-query";

import { unwrapResult } from "@/lib/action-result";

import { cardSpendingAction } from "../actions/accounts.actions";
import { accountsKey } from "./use-accounts";

/**
 * Card purchases of this month and last month. It lives under the accounts
 * key, so saving a transaction (which refreshes accounts) refreshes it too.
 */
export function useCardSpending(enabled = true) {
  return useQuery({
    queryKey: [...accountsKey, "card-spending"],
    queryFn: async () => unwrapResult(await cardSpendingAction()),
    enabled,
  });
}
