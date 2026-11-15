"use client";

import { PiggyBank } from "lucide-react";
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
import { formatMonth } from "@/lib/dates";

import { useBudgetForm } from "../hooks/use-budget-form";
import type { BudgetListItem } from "../types/budget.types";

type BudgetFormProps = {
  month: string;
  budget?: BudgetListItem;
  presetCategoryId?: string;
  budgetedCategoryIds: string[];
  onClose: () => void;
};

function BudgetForm({ month, budget, presetCategoryId, budgetedCategoryIds, onClose }: BudgetFormProps) {
  const b = useBudgetForm({ month, budget, presetCategoryId, budgetedCategoryIds, onSuccess: onClose });
  const { errors } = b.form.formState;

  if (b.allBudgeted) {
    return (
      <div className="space-y-4">
        <DialogHeader>
          <DialogTitle>Nuevo presupuesto</DialogTitle>
          <DialogDescription>Para {formatMonth(month)}.</DialogDescription>
        </DialogHeader>
        <EmptyState
          icon={PiggyBank}
          title="Todas tus categorías ya tienen presupuesto"
          description="Edita uno existente o crea una categoría de gasto nueva."
        />
      </div>
    );
  }

  return (
    <form onSubmit={b.onSubmit} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>{b.isEditing ? "Editar presupuesto" : "Nuevo presupuesto"}</DialogTitle>
        <DialogDescription>
          Cuánto quieres gastar como máximo en esta categoría durante {formatMonth(month)}.
        </DialogDescription>
      </DialogHeader>

      {b.isEditing ? (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Categoría</p>
          <p className="rounded-lg bg-muted px-3 py-2 text-sm">{b.categoryName}</p>
        </div>
      ) : (
        <FormField label="Categoría" htmlFor="budget-category" error={errors.categoryId?.message}>
          <Controller
            control={b.form.control}
            name="categoryId"
            render={({ field }) => (
              <EntitySelect
                id="budget-category"
                value={field.value}
                options={b.categoryOptions}
                placeholder="Elige una categoría de gasto"
                onChange={field.onChange}
              />
            )}
          />
        </FormField>
      )}

      <FormField label="Presupuesto (S/)" htmlFor="budget-amount" error={errors.amount?.message}>
        <Controller
          control={b.form.control}
          name="amount"
          render={({ field }) => (
            <MoneyInput
              id="budget-amount"
              ref={field.ref}
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

      {b.submitError && <ErrorMessage message={b.submitError} />}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 sm:min-h-8"
          onClick={onClose}
          disabled={b.isPending}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="min-h-11 sm:min-h-8"
          disabled={b.isPending || b.isLoadingOptions}
        >
          {b.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

type BudgetFormDialogProps = BudgetFormProps & { open: boolean };

export function BudgetFormDialog({ open, ...form }: BudgetFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && form.onClose()}>
      <DialogContent sheet>
        {/* Mounted only while open, so the form always starts from fresh defaults. */}
        <BudgetForm {...form} />
      </DialogContent>
    </Dialog>
  );
}
