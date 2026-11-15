"use client";

import { useState } from "react";

import { currentMonthRange } from "@/lib/dates";

import type { TransactionFilters } from "../schemas/transaction.schema";
import type { TransactionType } from "../types/transaction.types";

export type FilterState = {
  from: string;
  to: string;
  type: TransactionType | "";
  accountId: string;
  categoryId: string;
};

function defaultFilters(): FilterState {
  return { ...currentMonthRange(), type: "", accountId: "", categoryId: "" };
}

/** Filter state and pagination of the transactions list. */
export function useTransactionFilters(pageSize = 20) {
  const [defaults] = useState(defaultFilters);
  const [filters, setFilters] = useState<FilterState>(defaults);
  const [page, setPage] = useState(1);

  // Empty strings mean "no filter": they are dropped from the query.
  const query: TransactionFilters = {
    page,
    pageSize,
    ...(filters.from && { from: filters.from }),
    ...(filters.to && { to: filters.to }),
    ...(filters.type && { type: filters.type }),
    ...(filters.accountId && { accountId: filters.accountId }),
    ...(filters.categoryId && { categoryId: filters.categoryId }),
  };

  const isDefault = (Object.keys(defaults) as (keyof FilterState)[]).every(
    (key) => filters[key] === defaults[key],
  );

  return {
    filters,
    page,
    query,
    isDefault,
    // Changing any filter goes back to the first page.
    setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setFilters((current) => ({ ...current, [key]: value }));
      setPage(1);
    },
    setPage,
    reset: () => {
      setFilters(defaults);
      setPage(1);
    },
  };
}
