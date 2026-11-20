"use client";

import { toast } from "sonner";

import { useZodForm } from "@/hooks/use-zod-form";
import { ActionFailure, errorMessage } from "@/lib/action-result";
import { centsToPen } from "@/lib/money";

import {
  mindfulSettingsFormSchema,
  toMindfulSettings,
  type MindfulSettings,
  type MindfulSettingsFormValues,
} from "../schemas/settings.schema";
import { useSaveMindfulSettings } from "./use-mindful-settings";

function defaultsFor(settings: MindfulSettings): MindfulSettingsFormValues {
  return {
    enabled: settings.enabled,
    threshold: centsToPen(settings.thresholdCents),
    pauseMinutes: settings.pauseMinutes,
  };
}

/** Form of the "Compra consciente" settings page. */
export function useMindfulSettingsForm(settings: MindfulSettings) {
  const save = useSaveMindfulSettings();
  const { form, applyServerError, submitError } = useZodForm(
    mindfulSettingsFormSchema,
    defaultsFor(settings),
  );

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync(toMindfulSettings(values));
    } catch (error) {
      applyServerError({
        message: errorMessage(error),
        fieldErrors: error instanceof ActionFailure ? error.fieldErrors : undefined,
      });
      return;
    }
    toast.success("Ajustes guardados");
  });

  return { form, onSubmit, submitError, isPending: save.isPending };
}
