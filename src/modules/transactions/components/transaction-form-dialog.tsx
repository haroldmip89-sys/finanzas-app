"use client";

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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet } from "lucide-react";

import { MindfulPurchaseStep } from "@/modules/mindful-purchase/components/mindful-purchase-step";
import { useTransactionForm } from "../hooks/use-transaction-form";
import { CategoryChips } from "./category-chips";
import type { TransactionListItem, TransactionType } from "../types/transaction.types";

type TransactionFormProps = {
  transaction?: TransactionListItem;
  defaultType: TransactionType;
  onClose: () => void;
};

function TransactionForm({ transaction, defaultType, onClose }: TransactionFormProps) {
  const t = useTransactionForm({ transaction, defaultType, onSuccess: onClose });
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
            <Link href="/accounts" className={buttonVariants({ className: "" })}>
              Ir a Cuentas
            </Link>
          }
        />
      </div>
    );
  }

  if (t.mindful) {
    return <MindfulPurchaseStep {...t.mindful} error={t.submitError ?? undefined} />;
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
              className="h-16 rounded-2xl bg-background px-4 text-4xl font-extrabold tracking-tight"
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

      <FormField label="Fecha" htmlFor="tx-date" error={errors.date?.message}>
        <Input
          id="tx-date"
          type="date"
          aria-invalid={Boolean(errors.date)}
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
          render={({ field }) =>
            t.showChips ? (
              <CategoryChips
                categories={t.frequentCategories}
                value={field.value}
                onChange={field.onChange}
                onShowAll={t.showAllCategories}
              />
            ) : (
              <EntitySelect
                id="tx-category"
                value={field.value}
                options={t.categoryOptions}
                placeholder="Elige una categoría"
                onChange={field.onChange}
              />
            )
          }
        />
      </FormField>

      <FormField label="Nota (opcional)" htmlFor="tx-note" error={errors.note?.message}>
        <Input
          id="tx-note"
          autoComplete="off"
          maxLength={280}
          {...t.form.register("note")}
        />
      </FormField>

      {t.submitError && <ErrorMessage message={t.submitError} />}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={t.isPending}
        >
          Cancelar
        </Button>
        {!t.isEditing && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => t.onSubmitAndAddAnother()}
            disabled={t.isPending || t.isLoadingOptions}
          >
            Guardar y agregar otro
          </Button>
        )}
        <Button type="submit" disabled={t.isPending || t.isLoadingOptions}>
          {t.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

type TransactionFormDialogProps = {
  open: boolean;
  transaction?: TransactionListItem;
  /** Type preselected when creating (default: expense). */
  defaultType?: TransactionType;
  onClose: () => void;
};

export function TransactionFormDialog({
  open,
  transaction,
  defaultType = "expense",
  onClose,
}: TransactionFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent sheet>
        {/* Mounted only while open, so the form always starts from fresh defaults. */}
        <TransactionForm transaction={transaction} defaultType={defaultType} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
