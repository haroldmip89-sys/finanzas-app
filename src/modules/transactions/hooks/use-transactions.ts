"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { unwrapResult } from "@/lib/action-result";

import { listTransactionsAction } from "../actions/transactions.actions";
import type { TransactionFilters } from "../schemas/transaction.schema";

export const transactionsKey = ["transactions"] as const;

export function useTransactions(filters: TransactionFilters) {
  return useQuery({
    queryKey: [...transactionsKey, filters],
    queryFn: async () => unwrapResult(await listTransactionsAction(filters)),
    // Keep the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  });
}
