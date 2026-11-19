"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { unwrapResult } from "@/lib/action-result";
import { avoidedKey } from "@/lib/query-keys";

import { listAvoidedAction } from "../actions/avoided.actions";

export { avoidedKey };

export function useAvoided(month: string) {
  return useQuery({
    queryKey: [...avoidedKey, month],
    queryFn: async () => unwrapResult(await listAvoidedAction(month)),
    // Keep the previous month on screen while the next one loads.
    placeholderData: keepPreviousData,
  });
}
