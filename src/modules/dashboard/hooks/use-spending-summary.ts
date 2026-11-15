"use client";

import { useQuery } from "@tanstack/react-query";

import { unwrapResult } from "@/lib/action-result";
import { transactionsKey } from "@/modules/transactions/hooks/use-transactions";

import { spendingSummaryAction } from "../actions/dashboard.actions";

/** Under the transactions key: saving, editing or deleting one refreshes it. */
export function useSpendingSummary() {
  return useQuery({
    queryKey: [...transactionsKey, "spending-summary"],
    queryFn: async () => unwrapResult(await spendingSummaryAction()),
  });
}
