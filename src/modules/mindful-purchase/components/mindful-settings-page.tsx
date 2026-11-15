"use client";

import { Controller } from "react-hook-form";
import { toast } from "sonner";

import { ErrorMessage } from "@/components/shared/error-message";
import { FormField } from "@/components/shared/form-field";
import { MoneyInput } from "@/components/shared/money-input";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useZodForm } from "@/hooks/use-zod-form";
import { ActionFailure, errorMessage } from "@/lib/action-result";
import { centsToPen, penToCents } from "@/lib/money";

import { useMindfulSettings, useSaveMindfulSettings } from "../hooks/use-mindful-settings";
import {
  mindfulSettingsFormSchema,
  type MindfulSettingsFormValues,
} from "../schemas/mindful-settings.schema";
import type { MindfulSettings } from "../types/mindful-purchase.types";

function SettingsForm({ settings }: { settings: MindfulSettings }) {
  const save = useSaveMindfulSettings();
  const defaults: MindfulSettingsFormValues = {
    enabled: settings.enabled,
    threshold: centsToPen(settings.thresholdCents),
  };
  const { form, applyServerError, submitError } = useZodForm(mindfulSettingsFormSchema, defaults);
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync({
        enabled: values.enabled,
        thresholdCents: penToCents(values.threshold) ?? 0,
      });
    } catch (error) {
      applyServerError({
        message: errorMessage(error),
        fieldErrors: error instanceof ActionFailure ? error.fieldErrors : undefined,
      });
      return;
    }
    toast.success("Ajustes guardados");
  });

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-xl space-y-5">
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="min-w-0">
          <label htmlFor="mindful-enabled" className="block text-[15px] font-semibold">
            Pausa antes de gastos grandes
          </label>
          <p className="text-[13px] text-muted-foreground">
            Te muestra cómo quedan tu presupuesto y tu dinero disponible antes de guardar el gasto.
            Nunca te impide registrarlo.
          </p>
        </div>
        <Controller
          control={form.control}
          name="enabled"
          render={({ field }) => (
            <Switch id="mindful-enabled" checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
      </div>

      <FormField
        label="Desde qué monto (S/)"
        htmlFor="mindful-threshold"
        error={errors.threshold?.message}
      >
        <Controller
          control={form.control}
          name="threshold"
          render={({ field }) => (
            <MoneyInput
              id="mindful-threshold"
              ref={field.ref}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              aria-invalid={Boolean(errors.threshold)}
            />
          )}
        />
      </FormField>

      {submitError && <ErrorMessage message={submitError} />}

      <Button type="submit" disabled={save.isPending} className="w-full sm:w-auto">
        {save.isPending ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}

export function MindfulSettingsPage() {
  const query = useMindfulSettings();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compra consciente"
        description="Una pausa breve antes de registrar gastos grandes."
      />
      {query.isPending ? (
        <div className="max-w-xl space-y-3" aria-busy="true">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-11 rounded-lg" />
        </div>
      ) : query.isError ? (
        <ErrorMessage message="No pudimos cargar tus ajustes." onRetry={() => query.refetch()} />
      ) : (
        <SettingsForm settings={query.data} />
      )}
    </div>
  );
}
