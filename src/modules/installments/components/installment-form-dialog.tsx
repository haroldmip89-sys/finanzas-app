"use client";

import { CreditCard } from "lucide-react";
import { Controller } from "react-hook-form";

import { EmptyState } from "@/components/shared/empty-state";
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

import { useInstallmentForm } from "../hooks/use-installment-form";

function InstallmentForm({ onClose }: { onClose: () => void }) {
  const f = useInstallmentForm({ onSuccess: onClose });
  const { errors } = f.form.formState;

  if (f.hasNoCards) {
    return (
      <div className="space-y-4">
        <DialogHeader>
          <DialogTitle>Compra en cuotas</DialogTitle>
          <DialogDescription>Primero necesitas una tarjeta de crédito.</DialogDescription>
        </DialogHeader>
        <EmptyState
          icon={CreditCard}
          title="Aún no tienes tarjetas"
          description="Crea una cuenta de tipo tarjeta en Cuentas para registrar tus cuotas."
        />
      </div>
    );
  }

  return (
    <form onSubmit={f.onSubmit} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>Compra en cuotas</DialogTitle>
        <DialogDescription>
          Un recordatorio de lo que falta pagar. No cambia tus saldos ni tu dinero disponible.
        </DialogDescription>
      </DialogHeader>

      <FormField label="Nombre" htmlFor="inst-name" error={errors.name?.message}>
        <Input id="inst-name" autoComplete="off" maxLength={80} {...f.form.register("name")} />
      </FormField>

      <FormField label="Tarjeta" htmlFor="inst-account" error={errors.accountId?.message}>
        <Controller
          control={f.form.control}
          name="accountId"
          render={({ field }) => (
            <EntitySelect
              id="inst-account"
              value={field.value}
              options={f.cardOptions}
              placeholder="Elige una tarjeta"
              onChange={field.onChange}
            />
          )}
        />
      </FormField>

      <FormField label="Precio de la compra (S/)" htmlFor="inst-principal" error={errors.principal?.message}>
        <Controller
          control={f.form.control}
          name="principal"
          render={({ field }) => (
            <MoneyInput
              id="inst-principal"
              ref={field.ref}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              aria-invalid={Boolean(errors.principal)}
            />
          )}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="N.º de cuotas" htmlFor="inst-count" error={errors.count?.message}>
          <Input id="inst-count" inputMode="numeric" autoComplete="off" {...f.form.register("count")} />
        </FormField>
        <FormField label="Cuota (S/)" htmlFor="inst-installment" error={errors.installment?.message}>
          <Controller
            control={f.form.control}
            name="installment"
            render={({ field }) => (
              <MoneyInput
                id="inst-installment"
                ref={field.ref}
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                aria-invalid={Boolean(errors.installment)}
              />
            )}
          />
        </FormField>
      </div>

      <FormField label="Mes de la primera cuota" htmlFor="inst-month" error={errors.firstDueMonth?.message}>
        <Input id="inst-month" type="month" {...f.form.register("firstDueMonth")} />
      </FormField>

      {f.submitError && <ErrorMessage message={f.submitError} />}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={f.isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={f.isPending || f.isLoadingOptions}>
          {f.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function InstallmentFormDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent sheet>
        <InstallmentForm onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
