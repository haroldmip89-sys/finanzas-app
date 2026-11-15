"use client";

import Link from "next/link";
import { Controller } from "react-hook-form";

import { EmptyState } from "@/components/shared/empty-state";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet } from "lucide-react";

import {
  useTransactionForm,
  type SelectOption,
} from "../hooks/use-transaction-form";
import type { TransactionListItem, TransactionType } from "../types/transaction.types";

type EntitySelectProps = {
  id: string;
  value: string;
  options: SelectOption[];
  placeholder: string;
  onChange: (value: string) => void;
};

function EntitySelect({ id, value, options, placeholder, onChange }: EntitySelectProps) {
  const items = options.map((o) => ({ value: o.id, label: o.name }));
  return (
    <Select
      items={items}
      value={value || null}
      onValueChange={(next) => onChange(next ?? "")}
    >
      <SelectTrigger id={id} className="h-11 w-full md:h-8">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type TransactionFormProps = {
  transaction?: TransactionListItem;
  onClose: () => void;
};

function TransactionForm({ transaction, onClose }: TransactionFormProps) {
  const t = useTransactionForm({ transaction, onSuccess: onClose });
  const { errors } = t.form.formState;

  if (t.hasNoAccounts) {
    return (
      <div className="space-y-4">
        <DialogHeader>
          <DialogTitle>Nueva transacción</DialogTitle>
          <DialogDescription>Primero necesitas una cuenta.</DialogDescription>
        </DialogHeader>
        <EmptyState
          icon={Wallet}
          title="Aún no tienes cuentas"
          description="Crea una cuenta (BBVA, Yape, efectivo...) para registrar tus movimientos."
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
        <DialogTitle>{t.isEditing ? "Editar transacción" : "Nueva transacción"}</DialogTitle>
        <DialogDescription>Registra un ingreso o un gasto en una de tus cuentas.</DialogDescription>
      </DialogHeader>

      <Tabs value={t.type} onValueChange={(v) => t.changeType(v as TransactionType)}>
        <TabsList className="h-11 w-full">
          <TabsTrigger value="expense" className="min-h-9 flex-1">
            Gasto
          </TabsTrigger>
          <TabsTrigger value="income" className="min-h-9 flex-1">
            Ingreso
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <FormField label="Monto (S/)" htmlFor="tx-amount" error={errors.amount?.message}>
        <Controller
          control={t.form.control}
          name="amount"
          render={({ field }) => (
            <MoneyInput
              id="tx-amount"
              autoFocus
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              aria-invalid={Boolean(errors.amount)}
              className="h-11 md:h-8"
            />
          )}
        />
      </FormField>

      <FormField label="Fecha" htmlFor="tx-date" error={errors.date?.message}>
        <Input
          id="tx-date"
          type="date"
          aria-invalid={Boolean(errors.date)}
          className="h-11 md:h-8"
          {...t.form.register("date")}
        />
      </FormField>

      <FormField label="Cuenta" htmlFor="tx-account" error={errors.accountId?.message}>
        <Controller
          control={t.form.control}
          name="accountId"
          render={({ field }) => (
            <EntitySelect
              id="tx-account"
              value={field.value}
              options={t.accountOptions}
              placeholder="Elige una cuenta"
              onChange={field.onChange}
            />
          )}
        />
      </FormField>

      <FormField label="Categoría" htmlFor="tx-category" error={errors.categoryId?.message}>
        <Controller
          control={t.form.control}
          name="categoryId"
          render={({ field }) => (
            <EntitySelect
              id="tx-category"
              value={field.value}
              options={t.categoryOptions}
              placeholder="Elige una categoría"
              onChange={field.onChange}
            />
          )}
        />
      </FormField>

      <FormField label="Nota (opcional)" htmlFor="tx-note" error={errors.note?.message}>
        <Input
          id="tx-note"
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
        <Button type="submit" className="min-h-11 sm:min-h-8" disabled={t.isPending || t.isLoadingOptions}>
          {t.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

type TransactionFormDialogProps = {
  open: boolean;
  transaction?: TransactionListItem;
  onClose: () => void;
};

export function TransactionFormDialog({
  open,
  transaction,
  onClose,
}: TransactionFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        {/* Mounted only while open, so the form always starts from fresh defaults. */}
        <TransactionForm transaction={transaction} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
