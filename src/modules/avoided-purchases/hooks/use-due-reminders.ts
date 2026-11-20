"use client";

import { useQuery } from "@tanstack/react-query";

import { unwrapResult } from "@/lib/action-result";

import { listDueRemindersAction } from "../actions/avoided.actions";
import { avoidedKey } from "./use-avoided";

/** Postponed purchases whose pause is over. Checked again every minute while the app is open. */
export function useDueReminders(enabled = true) {
  return useQuery({
    queryKey: [...avoidedKey, "due"],
    queryFn: async () => unwrapResult(await listDueRemindersAction()),
    refetchInterval: 60_000,
    enabled,
  });
}
