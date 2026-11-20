"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { unwrapResult } from "@/lib/action-result";

import { getMindfulSettingsAction, saveMindfulSettingsAction } from "../actions/settings.actions";
import { DEFAULT_MINDFUL_SETTINGS, type MindfulSettings } from "../schemas/settings.schema";

export const settingsKey = ["user-settings"] as const;

/**
 * The user's mindful purchase settings. `enabled` is false until they are
 * known, so nothing flashes on screen for someone who turned the feature off.
 */
export function useMindfulSettings() {
  const query = useQuery({
    queryKey: settingsKey,
    queryFn: async () => unwrapResult(await getMindfulSettingsAction()),
  });
  const settings: MindfulSettings = query.data ?? { ...DEFAULT_MINDFUL_SETTINGS };

  return {
    settings,
    isLoaded: query.isSuccess,
    enabled: query.isSuccess && settings.enabled,
    isError: query.isError,
    refetch: () => query.refetch(),
  };
}

export function useSaveMindfulSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: MindfulSettings) => unwrapResult(await saveMindfulSettingsAction(input)),
    onSuccess: (data) => client.setQueryData(settingsKey, data),
  });
}
