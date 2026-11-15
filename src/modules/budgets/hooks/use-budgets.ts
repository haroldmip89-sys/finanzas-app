"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { unwrapResult } from "@/lib/action-result";
import { budgetsKey } from "@/lib/query-keys";

import { listBudgetsAction } from "../actions/budgets.actions";

export { budgetsKey };

export function useBudgets(month: string) {
  return useQuery({
    queryKey: [...budgetsKey, month],
    queryFn: async () => unwrapResult(await listBudgetsAction(month)),
    // Keep the previous month on screen while the next one loads.
    placeholderData: keepPreviousData,
  });
}
