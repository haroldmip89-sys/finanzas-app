"use client";

import { Controller } from "react-hook-form";

import { ErrorMessage } from "@/components/shared/error-message";
import { FormField } from "@/components/shared/form-field";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useCategoryForm } from "../hooks/use-category-form";
import type { Category, CategoryKind } from "../types/category.types";
import { IconPicker } from "./icon-picker";

const KIND_OPTIONS = [
  { value: "expense", label: "Gasto" },
  { value: "income", label: "Ingreso" },
];

type CategoryFormProps = {
  category?: Category;
  defaultKind: CategoryKind;
  onClose: () => void;
};

function CategoryForm({ category, defaultKind, onClose }: CategoryFormProps) {
  const { form, onSubmit, submitError, isPending, isEditing } = useCategoryForm({
    category,
    defaultKind,
    onSuccess: onClose,
  });
  const { errors } = form.formState;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>{isEditing ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
        <DialogDescription>
          Agrupa tus movimientos. El tipo no se puede cambiar después de crearla.
        </DialogDescription>
      </DialogHeader>

      <FormField label="Nombre" htmlFor="category-name" error={errors.name?.message}>
        <Input
          id="category-name"
          autoFocus
          autoComplete="off"
          aria-invalid={Boolean(errors.name)}
          className="h-11 md:h-8"
          {...form.register("name")}
        />
      </FormField>

      <FormField label="Tipo" htmlFor="category-kind" error={errors.kind?.message}>
        <Controller
          control={form.control}
          name="kind"
          render={({ field }) => (
            <Select
              items={KIND_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
              disabled={isEditing}
            >
              <SelectTrigger id="category-kind" className="h-11 w-full md:h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KIND_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <div className="space-y-1.5">
        <Label id="category-icon-label">Icono</Label>
        <Controller
          control={form.control}
          name="icon"
          render={({ field }) => (
            <IconPicker
              value={field.value}
              onChange={field.onChange}
              labelledBy="category-icon-label"
            />
          )}
        />
        {errors.icon?.message && (
          <p role="alert" className="text-xs text-destructive">
            {errors.icon.message}
          </p>
        )}
      </div>

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

type CategoryFormDialogProps = {
  open: boolean;
  category?: Category;
  defaultKind: CategoryKind;
  onClose: () => void;
};

export function CategoryFormDialog({
  open,
  category,
  defaultKind,
  onClose,
}: CategoryFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent sheet>
        {/* Mounted only while open, so the form always starts from fresh defaults. */}
        <CategoryForm category={category} defaultKind={defaultKind} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
