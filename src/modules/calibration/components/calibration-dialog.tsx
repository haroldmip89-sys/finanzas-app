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
import { formatPen } from "@/lib/money";
import { describeDebt } from "@/modules/accounts/card-summary";

import { useCalibrationForm } from "../hooks/use-calibration-form";
import type { CalibrationPreview } from "../types/calibration.types";

function previewText(preview: CalibrationPreview, isCard: boolean): string {
  if (isCard) {
    // A card is a debt: a balance that goes up means the debt goes down.
    switch (preview.kind) {
      case "none":
        return "Escribe la deuda que muestra tu banco.";
      case "same":
        return "La deuda ya coincide, no hay nada que ajustar.";
      case "income":
        return `La deuda baja en ${formatPen(preview.amountCents)} · se registrará un ajuste.`;
      case "expense":
        return `La deuda sube en ${formatPen(preview.amountCents)} · se registrará un ajuste.`;
    }
  }
  switch (preview.kind) {
    case "none":
      return "Escribe el saldo que ves en tu banco o billetera.";
    case "same":
      return "El saldo ya coincide, no hay nada que ajustar.";
    case "income":
      return `Diferencia: +${formatPen(preview.amountCents)} · se registrará un ingreso de ajuste.`;
    case "expense":
      return `Diferencia: −${formatPen(preview.amountCents)} · se registrará un gasto de ajuste.`;
  }
}

function currentText(balanceCents: number | null, isCard: boolean): string {
  if (balanceCents === null) return "—";
  if (!isCard) return formatPen(balanceCents);
  const debt = describeDebt(balanceCents);
  if (debt.kind === "debt") return formatPen(debt.cents);
  return debt.kind === "credit" ? `A favor ${formatPen(debt.cents)}` : "Sin deuda";
}

type CalibrationFormProps = { accountId?: string; onClose: () => void };

function CalibrationForm({ accountId, onClose }: CalibrationFormProps) {
  const c = useCalibrationForm({ accountId, onSuccess: onClose });
  const { errors } = c.form.formState;

  if (c.hasNoAccounts) {
    return (
      <div className="space-y-4">
        <DialogHeader>
          <DialogTitle>Calibrar saldo</DialogTitle>
          <DialogDescription>Primero necesitas una cuenta.</DialogDescription>
        </DialogHeader>
        <EmptyState
          icon={Wallet}
          title="Aún no tienes cuentas"
          description="Crea una cuenta para poder calibrar su saldo."
          action={
            <Link href="/accounts" className={buttonVariants({ className: "" })}>
              Ir a Cuentas
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <form onSubmit={c.onSubmit} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>Calibrar saldo</DialogTitle>
        <DialogDescription>
          Escribe el saldo real y la app registra un solo ajuste por la diferencia. No cuenta como
          ingreso ni gasto.
        </DialogDescription>
      </DialogHeader>

      {c.accountFixed ? (
        <p className="font-medium">{c.selectedAccountName ?? "…"}</p>
      ) : (
        <FormField label="Cuenta" htmlFor="cal-account" error={errors.accountId?.message}>
          <Controller
            control={c.form.control}
            name="accountId"
            render={({ field }) => (
              <EntitySelect
                id="cal-account"
                value={field.value}
                options={c.accountOptions}
                placeholder="Elige una cuenta"
                onChange={field.onChange}
              />
            )}
          />
        </FormField>
      )}

      <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
        <span className="text-muted-foreground">{c.isCard ? "Deuda en la app" : "Saldo en la app"}</span>
        <span className="font-semibold tabular-nums">
          {currentText(c.currentBalanceCents, c.isCard)}
        </span>
      </div>

      <FormField
        label={c.isCard ? "Deuda real (S/)" : "Saldo real (S/)"}
        htmlFor="cal-real"
        error={errors.realBalance?.message}
        hint={
          c.isCard
            ? "La deuda que muestra tu banco, en positivo. Usa - si tienes saldo a favor."
            : "Usa - si la cuenta está en negativo."
        }
      >
        <Controller
          control={c.form.control}
          name="realBalance"
          render={({ field }) => (
            <MoneyInput
              id="cal-real"
              ref={field.ref}
              autoFocus
              allowNegative
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              aria-invalid={Boolean(errors.realBalance)}
            />
          )}
        />
      </FormField>

      <p aria-live="polite" className="text-sm text-muted-foreground">
        {previewText(c.preview, c.isCard)}
      </p>

      {c.submitError && <ErrorMessage message={c.submitError} />}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={c.isPending}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={c.isPending || c.isLoadingOptions || !c.canSubmit}
        >
          {c.isPending ? "Calibrando..." : "Calibrar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

type CalibrationDialogProps = {
  open: boolean;
  /** Account fixed by the caller; without it the user picks one. */
  accountId?: string;
  onClose: () => void;
};

export function CalibrationDialog({ open, accountId, onClose }: CalibrationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent sheet>
        {/* Mounted only while open, so the form always starts from fresh defaults. */}
        <CalibrationForm accountId={accountId} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
