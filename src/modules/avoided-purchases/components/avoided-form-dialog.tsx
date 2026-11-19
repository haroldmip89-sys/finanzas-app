"use client";

import { Controller } from "react-hook-form";

import { EntitySelect } from "@/components/shared/entity-select";
import { ErrorMessage } from "@/components/shared/error-message";
import { FormField } from "@/components/shared/form-field";
import { MoneyInput } from "@/components/shared/money-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { NONE, useAvoidedForm } from "../hooks/use-avoided-form";
import { AVOIDED_NOTE_MAX } from "../schemas/avoided.schema";
import type { AvoidedItem, AvoidedStatus } from "../types/avoided.types";

type AvoidedFormProps = { item?: AvoidedItem; onClose: () => void };

function AvoidedForm({ item, onClose }: AvoidedFormProps) {
  const a = useAvoidedForm({ item, onSuccess: onClose });
  const { errors } = a.form.formState;
  const status = a.form.watch("status");

  return (
    <form onSubmit={a.onSubmit} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>{a.isEditing ? "Editar compra evitada" : "Compra evitada"}</DialogTitle>
        <DialogDescription>
          Una compra que decidiste no hacer. No cambia tus saldos: es lo que habrías gastado, no dinero
          ahorrado.
        </DialogDescription>
      </DialogHeader>

      <Tabs
        value={status}
        onValueChange={(v) => a.form.setValue("status", v as AvoidedStatus, { shouldDirty: true })}
      >
        <TabsList className="w-full">
          <TabsTrigger value="avoided" className="flex-1">
            Evitada
          </TabsTrigger>
          <TabsTrigger value="postponed" className="flex-1">
            Pospuesta
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <FormField label="Monto estimado (S/)" htmlFor="avoided-amount" error={errors.amount?.message}>
        <Controller
          control={a.form.control}
          name="amount"
          render={({ field }) => (
            <MoneyInput
              id="avoided-amount"
              ref={field.ref}
              autoFocus
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              aria-invalid={Boolean(errors.amount)}
            />
          )}
        />
      </FormField>

      <FormField label="¿Qué era? (opcional)" htmlFor="avoided-note" error={errors.note?.message}>
        <Input
          id="avoided-note"
          autoComplete="off"
          maxLength={AVOIDED_NOTE_MAX}
          aria-invalid={Boolean(errors.note)}
          {...a.form.register("note")}
        />
      </FormField>

      <FormField label="Categoría (opcional)" htmlFor="avoided-category" error={errors.categoryId?.message}>
        <Controller
          control={a.form.control}
          name="categoryId"
          render={({ field }) => (
            <EntitySelect
              id="avoided-category"
              value={field.value || NONE}
              options={a.categoryOptions}
              placeholder="Sin categoría"
              onChange={(next) => field.onChange(next === NONE ? "" : next)}
            />
          )}
        />
      </FormField>

      <FormField label="Motivo (opcional)" htmlFor="avoided-reason" error={errors.reason?.message}>
        <Controller
          control={a.form.control}
          name="reason"
          render={({ field }) => (
            <EntitySelect
              id="avoided-reason"
              value={field.value || NONE}
              options={a.reasonOptions}
              placeholder="Sin motivo"
              onChange={(next) => field.onChange(next === NONE ? "" : next)}
            />
          )}
        />
      </FormField>

      <FormField label="Fecha" htmlFor="avoided-date" error={errors.date?.message}>
        <Input
          id="avoided-date"
          type="date"
          max={a.today}
          aria-invalid={Boolean(errors.date)}
          {...a.form.register("date")}
        />
      </FormField>

      {a.submitError && <ErrorMessage message={a.submitError} />}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={a.isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={a.isPending}>
          {a.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

type AvoidedFormDialogProps = AvoidedFormProps & { open: boolean };

export function AvoidedFormDialog({ open, ...form }: AvoidedFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && form.onClose()}>
      <DialogContent sheet>
        {/* Mounted only while open, so the form always starts from fresh defaults. */}
        <AvoidedForm {...form} />
      </DialogContent>
    </Dialog>
  );
}
