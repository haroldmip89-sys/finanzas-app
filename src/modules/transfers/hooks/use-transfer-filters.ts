"use client";

import { useState } from "react";

import { currentMonthRange } from "@/lib/dates";

import type { TransferFilters } from "../schemas/transfer.schema";

export type FilterState = {
  from: string;
  to: string;
  accountId: string;
};

function defaultFilters(): FilterState {
  return { ...currentMonthRange(), accountId: "" };
}

/** Filter state and pagination of the transfers list. */
export function useTransferFilters(pageSize = 20) {
  const [defaults] = useState(defaultFilters);
  const [filters, setFilters] = useState<FilterState>(defaults);
  const [page, setPage] = useState(1);

  // Empty strings mean "no filter": they are dropped from the query.
  const query: TransferFilters = {
    page,
    pageSize,
    ...(filters.from && { from: filters.from }),
    ...(filters.to && { to: filters.to }),
    ...(filters.accountId && { accountId: filters.accountId }),
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
