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
  payCardId?: string;
  onClose: () => void;
};

function TransferForm({ transfer, payCardId, onClose }: TransferFormProps) {
  const t = useTransferForm({ transfer, payCardId, onSuccess: onClose });
  const { errors } = t.form.formState;

  if (t.cardUnavailable) {
    return (
      <div className="space-y-4">
        <DialogHeader>
          <DialogTitle>Pagar tarjeta</DialogTitle>
          <DialogDescription>No se puede pagar esta tarjeta.</DialogDescription>
        </DialogHeader>
        <ErrorMessage message="La tarjeta no existe o está archivada." />
      </div>
    );
  }

  if (t.needsMoreAccounts && t.isPayingCard) {
    return (
      <div className="space-y-4">
        <DialogHeader>
          <DialogTitle>Pagar tarjeta</DialogTitle>
          <DialogDescription>Necesitas una cuenta desde donde pagar.</DialogDescription>
        </DialogHeader>
        <EmptyState
          icon={Wallet}
          title="No tienes una cuenta para pagar"
          description="Crea una cuenta de efectivo, banco o billetera para pagar la tarjeta."
          action={
            <Link href="/accounts" className={buttonVariants({ className: "min-h-11 sm:min-h-8" })}>
              Ir a Cuentas
            </Link>
          }
        />
      </div>
    );
  }

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
        <DialogTitle>
          {t.isPayingCard
            ? "Pagar tarjeta"
            : t.isEditing
              ? "Editar transferencia"
              : "Nueva transferencia"}
        </DialogTitle>
        <DialogDescription>
          {t.isPayingCard
            ? `Paga ${t.destinationName ?? "la tarjeta"} desde una de tus cuentas. No cuenta como gasto.`
            : "Mueve dinero entre tus cuentas. No cuenta como ingreso ni gasto."}
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

      {t.isPayingCard ? (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Hacia</p>
          <p className="rounded-lg bg-muted px-3 py-2 text-sm">{t.destinationName}</p>
        </div>
      ) : (
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
      )}

      <FormField label="Monto (S/)" htmlFor="tr-amount" error={errors.amount?.message}>
        <Controller
          control={t.form.control}
          name="amount"
          render={({ field }) => (
            <MoneyInput
              id="tr-amount"
              autoFocus={t.isPayingCard}
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
  /** Pays this card instead of a free transfer. */
  payCardId?: string;
  onClose: () => void;
};

export function TransferFormDialog({ open, transfer, payCardId, onClose }: TransferFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent sheet>
        {/* Mounted only while open, so the form always starts from fresh defaults. */}
        <TransferForm transfer={transfer} payCardId={payCardId} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
