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

import { useAvoidedForm } from "../hooks/use-avoided-form";
import { REASON_LABELS } from "../schemas/avoided-purchase.schema";

const REASON_OPTIONS = Object.entries(REASON_LABELS).map(([id, name]) => ({ id, name }));

function AvoidedForm({ onClose }: { onClose: () => void }) {
  const f = useAvoidedForm({ onSuccess: onClose });
  const { errors } = f.form.formState;

  return (
    <form onSubmit={f.onSubmit} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>Compra evitada</DialogTitle>
        <DialogDescription>
          Algo que decidiste no comprar. No cambia tus saldos ni tu dinero disponible.
        </DialogDescription>
      </DialogHeader>

      <FormField label="Valor estimado (S/)" htmlFor="avoided-amount" error={errors.amount?.message}>
        <Controller
          control={f.form.control}
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

      <FormField label="Categoría (opcional)" htmlFor="avoided-category" error={errors.categoryId?.message}>
        <Controller
          control={f.form.control}
          name="categoryId"
          render={({ field }) => (
            <EntitySelect
              id="avoided-category"
              value={field.value}
              options={f.categoryOptions}
              placeholder="Sin categoría"
              onChange={field.onChange}
            />
          )}
        />
      </FormField>

      <FormField label="Motivo (opcional)" htmlFor="avoided-reason" error={errors.reason?.message}>
        <Controller
          control={f.form.control}
          name="reason"
          render={({ field }) => (
            <EntitySelect
              id="avoided-reason"
              value={field.value}
              options={REASON_OPTIONS}
              placeholder="Sin motivo"
              onChange={field.onChange}
            />
          )}
        />
      </FormField>

      <FormField label="Fecha" htmlFor="avoided-date" error={errors.date?.message}>
        <Input id="avoided-date" type="date" aria-invalid={Boolean(errors.date)} {...f.form.register("date")} />
      </FormField>

      <FormField label="Nota (opcional)" htmlFor="avoided-note" error={errors.note?.message}>
        <Input id="avoided-note" autoComplete="off" maxLength={280} {...f.form.register("note")} />
      </FormField>

      {f.submitError && <ErrorMessage message={f.submitError} />}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={f.isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={f.isPending}>
          {f.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

type AvoidedFormDialogProps = { open: boolean; onClose: () => void };

export function AvoidedFormDialog({ open, onClose }: AvoidedFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent sheet>
        {/* Mounted only while open, so the form always starts from fresh defaults. */}
        <AvoidedForm onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
