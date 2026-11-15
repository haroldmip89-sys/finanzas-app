"use client";

import { Wallet } from "lucide-react";
import Link from "next/link";
import { Controller } from "react-hook-form";

import { EmptyState } from "@/components/shared/empty-state";
import { EntitySelect } from "@/components/shared/entity-select";
import { ErrorMessage } from "@/components/shared/error-message";
import { FormField } from "@/components/shared/form-field";
import { MoneyInput } from "@/components/shared/money-input";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { useTransferForm } from "../hooks/use-transfer-form";
import type { TransferListItem } from "../types/transfer.types";

type TransferFormProps = {
  transfer?: TransferListItem;
  onClose: () => void;
};

function TransferForm({ transfer, onClose }: TransferFormProps) {
  const t = useTransferForm({ transfer, onSuccess: onClose });
  const { errors } = t.form.formState;

  if (t.needsMoreAccounts) {
    return (
      <div className="space-y-4">
        <DialogHeader>
          <DialogTitle>Nueva transferencia</DialogTitle>
          <DialogDescription>Necesitas al menos dos cuentas.</DialogDescription>
        </DialogHeader>
        <EmptyState
          icon={Wallet}
          title="Necesitas dos cuentas"
          description="Crea otra cuenta para poder mover dinero entre ellas."
          action={
            <Link href="/accounts" className={buttonVariants({ className: "min-h-11 sm:min-h-8" })}>
              Ir a Cuentas
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <form onSubmit={t.onSubmit} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>{t.isEditing ? "Editar transferencia" : "Nueva transferencia"}</DialogTitle>
        <DialogDescription>
          Mueve dinero entre tus cuentas. No cuenta como ingreso ni gasto.
        </DialogDescription>
      </DialogHeader>

      <FormField label="Desde" htmlFor="tr-from" error={errors.fromAccountId?.message}>
        <Controller
          control={t.form.control}
          name="fromAccountId"
          render={({ field }) => (
            <EntitySelect
              id="tr-from"
              value={field.value}
              options={t.fromOptions}
              placeholder="Cuenta de origen"
              onChange={t.changeFrom}
            />
          )}
        />
      </FormField>

      <FormField label="Hacia" htmlFor="tr-to" error={errors.toAccountId?.message}>
        <Controller
          control={t.form.control}
          name="toAccountId"
          render={({ field }) => (
            <EntitySelect
              id="tr-to"
              value={field.value}
              options={t.toOptions}
              placeholder="Cuenta de destino"
              onChange={field.onChange}
            />
          )}
        />
      </FormField>

      <FormField label="Monto (S/)" htmlFor="tr-amount" error={errors.amount?.message}>
        <Controller
          control={t.form.control}
          name="amount"
          render={({ field }) => (
            <MoneyInput
              id="tr-amount"
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              aria-invalid={Boolean(errors.amount)}
              className="h-11 md:h-8"
            />
          )}
        />
      </FormField>

      <FormField label="Fecha" htmlFor="tr-date" error={errors.date?.message}>
        <Input
          id="tr-date"
          type="date"
          aria-invalid={Boolean(errors.date)}
          className="h-11 md:h-8"
          {...t.form.register("date")}
        />
      </FormField>

      <FormField label="Nota (opcional)" htmlFor="tr-note" error={errors.note?.message}>
        <Input
          id="tr-note"
          autoComplete="off"
          maxLength={280}
          className="h-11 md:h-8"
          {...t.form.register("note")}
        />
      </FormField>

      {t.submitError && <ErrorMessage message={t.submitError} />}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 sm:min-h-8"
          onClick={onClose}
          disabled={t.isPending}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="min-h-11 sm:min-h-8"
          disabled={t.isPending || t.isLoadingOptions}
        >
          {t.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

type TransferFormDialogProps = {
  open: boolean;
  transfer?: TransferListItem;
  onClose: () => void;
};

export function TransferFormDialog({ open, transfer, onClose }: TransferFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        {/* Mounted only while open, so the form always starts from fresh defaults. */}
        <TransferForm transfer={transfer} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
