"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { unwrapResult } from "@/lib/action-result";

import {
  getMindfulSettingsAction,
  saveMindfulSettingsAction,
} from "../actions/mindful-settings.actions";
import type { MindfulSettingsInput } from "../schemas/mindful-settings.schema";

export const mindfulSettingsKey = ["mindful-settings"] as const;

export function useMindfulSettings() {
  return useQuery({
    queryKey: mindfulSettingsKey,
    queryFn: async () => unwrapResult(await getMindfulSettingsAction()),
    staleTime: 5 * 60_000,
  });
}

export function useSaveMindfulSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: MindfulSettingsInput) =>
      unwrapResult(await saveMindfulSettingsAction(input)),
    onSuccess: (data) => client.setQueryData(mindfulSettingsKey, data),
  });
}
