"use client";

import { Controller } from "react-hook-form";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ACCOUNT_TYPE_OPTIONS } from "../constants/account-types";
import { useAccountForm } from "../hooks/use-account-form";
import type { Account } from "../types/account.types";

type AccountFormProps = { account?: Account; onClose: () => void };

function AccountForm({ account, onClose }: AccountFormProps) {
  const { form, onSubmit, submitError, isPending, isEditing } = useAccountForm({
    account,
    onSuccess: onClose,
  });
  const { errors } = form.formState;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>{isEditing ? "Editar cuenta" : "Nueva cuenta"}</DialogTitle>
        <DialogDescription>
          Cuentas donde guardas tu dinero: efectivo, banco, tarjeta o billetera.
        </DialogDescription>
      </DialogHeader>

      <FormField label="Nombre" htmlFor="account-name" error={errors.name?.message}>
        <Input
          id="account-name"
          autoFocus
          autoComplete="off"
          aria-invalid={Boolean(errors.name)}
          className="h-11 md:h-8"
          {...form.register("name")}
        />
      </FormField>

      <FormField label="Tipo" htmlFor="account-type" error={errors.type?.message}>
        <Controller
          control={form.control}
          name="type"
          render={({ field }) => (
            <Select
              items={ACCOUNT_TYPE_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
            >
              <SelectTrigger id="account-type" className="h-11 w-full md:h-8">
                <SelectValue placeholder="Elige un tipo" />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <FormField
        label="Saldo inicial (S/)"
        htmlFor="account-balance"
        error={errors.initialBalance?.message}
        hint="Lo que tienes hoy en esta cuenta. Déjalo vacío si es 0. Usa - para una deuda, ej. tarjeta de crédito."
      >
        <Controller
          control={form.control}
          name="initialBalance"
          render={({ field }) => (
            <MoneyInput
              id="account-balance"
              allowNegative
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              aria-invalid={Boolean(errors.initialBalance)}
              className="h-11 md:h-8"
            />
          )}
        />
      </FormField>

      {submitError && <ErrorMessage message={submitError} />}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 sm:min-h-8"
          onClick={onClose}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" className="min-h-11 sm:min-h-8" disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

type AccountFormDialogProps = {
  open: boolean;
  account?: Account;
  onClose: () => void;
};

export function AccountFormDialog({ open, account, onClose }: AccountFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent sheet>
        {/* Mounted only while open, so the form always starts from fresh defaults. */}
        <AccountForm account={account} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
