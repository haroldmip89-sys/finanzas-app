"use client";

import { useQuery } from "@tanstack/react-query";

import { unwrapResult } from "@/lib/action-result";

import { listFrequentCategoriesAction } from "../actions/transactions.actions";
import type { TransactionType } from "../types/transaction.types";
import { transactionsKey } from "./use-transactions";

/** Most used categories of a type (refreshed whenever a transaction is saved). */
export function useFrequentCategories(type: TransactionType) {
  return useQuery({
    queryKey: [...transactionsKey, "frequent", type],
    queryFn: async () => unwrapResult(await listFrequentCategoriesAction(type)),
  });
}
