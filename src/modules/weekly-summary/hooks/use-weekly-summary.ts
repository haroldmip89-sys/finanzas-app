"use client";

import { useQuery } from "@tanstack/react-query";

import { unwrapResult } from "@/lib/action-result";
import { accountsKey } from "@/modules/accounts/hooks/use-accounts";

import { getWeeklySummaryAction } from "../actions/weekly-summary.actions";

/** Depends on spending and balances: under the accounts key, which transactions,
 * transfers and calibrations already invalidate. */
export function useWeeklySummary() {
  return useQuery({
    queryKey: [...accountsKey, "weekly-summary"],
    queryFn: async () => unwrapResult(await getWeeklySummaryAction()),
  });
}
