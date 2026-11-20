"use client";

import { Controller } from "react-hook-form";

import { ErrorMessage } from "@/components/shared/error-message";
import { FormField } from "@/components/shared/form-field";
import { MoneyInput } from "@/components/shared/money-input";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useMindfulSettings } from "../hooks/use-mindful-settings";
import { useMindfulSettingsForm } from "../hooks/use-mindful-settings-form";
import type { MindfulSettings } from "../schemas/settings.schema";

function SettingsForm({ settings }: { settings: MindfulSettings }) {
  const s = useMindfulSettingsForm(settings);
  const { errors } = s.form.formState;

  return (
    <form onSubmit={s.onSubmit} noValidate className="max-w-xl space-y-5">
      <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="min-w-0 space-y-1">
          <Label htmlFor="mindful-enabled">Activar compra consciente</Label>
          <p className="text-[13px] text-muted-foreground">
            Añade &ldquo;Evaluar una compra&rdquo; al menú &ldquo;+&rdquo;, un aviso discreto en los gastos grandes y recordatorios de lo
            que estabas pensando comprar.
          </p>
        </div>
        <Controller
          control={s.form.control}
          name="enabled"
          render={({ field }) => (
            <Switch id="mindful-enabled" checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
      </div>

      <FormField
        label="Umbral de compra grande (S/)"
        htmlFor="mindful-threshold"
        error={errors.threshold?.message}
        hint="Un gasto nuevo por encima de este monto muestra el aviso para pensarlo. Nunca bloquea el guardado."
      >
        <Controller
          control={s.form.control}
          name="threshold"
          render={({ field }) => (
            <MoneyInput
              id="mindful-threshold"
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              aria-invalid={Boolean(errors.threshold)}
            />
          )}
        />
      </FormField>

      <div className="space-y-2">
        <p className="text-sm font-medium">Pausa por defecto</p>
        <Controller
          control={s.form.control}
          name="pauseMinutes"
          render={({ field }) => (
            <Tabs value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
              <TabsList className="w-full">
                <TabsTrigger value="10" className="flex-1">
                  10 minutos
                </TabsTrigger>
                <TabsTrigger value="1440" className="flex-1">
                  24 horas
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        />
        <p className="text-[13px] text-muted-foreground">
          Es la que aparece marcada al tocar &ldquo;Pensarlo&rdquo;; siempre puedes cambiarla en el momento.
        </p>
      </div>

      {s.submitError && <ErrorMessage message={s.submitError} />}

      <Button type="submit" disabled={s.isPending} className="w-full sm:w-auto">
        {s.isPending ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}

export function MindfulSettingsPage() {
  const mindful = useMindfulSettings();

  return (
    <div className="space-y-6">
      <PageHeader title="Compra consciente" description="Una pausa opcional antes de comprar." />
      {mindful.isError ? (
        <ErrorMessage message="No pudimos cargar tus ajustes. Tus datos están a salvo." onRetry={mindful.refetch} />
      ) : !mindful.isLoaded ? (
        <div className="max-w-xl space-y-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : (
        <SettingsForm settings={mindful.settings} />
      )}
    </div>
  );
}
