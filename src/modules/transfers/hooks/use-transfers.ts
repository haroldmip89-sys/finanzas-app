"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { unwrapResult } from "@/lib/action-result";

import { listTransfersAction } from "../actions/transfers.actions";
import type { TransferFilters } from "../schemas/transfer.schema";

export const transfersKey = ["transfers"] as const;

export function useTransfers(filters: TransferFilters) {
  return useQuery({
    queryKey: [...transfersKey, filters],
    queryFn: async () => unwrapResult(await listTransfersAction(filters)),
    // Keep the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  });
}
