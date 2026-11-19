"use client";

import { useQuery } from "@tanstack/react-query";

import { unwrapResult } from "@/lib/action-result";
import { transactionsKey } from "@/modules/transactions/hooks/use-transactions";

import { dailySpendingAction } from "../actions/dashboard.actions";

/** Under the transactions key: saving, editing or deleting one refreshes it. */
export function useDailySpending() {
  return useQuery({
    queryKey: [...transactionsKey, "daily-spending"],
    queryFn: async () => unwrapResult(await dailySpendingAction()),
  });
}
