"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import type { SelectOption } from "@/components/shared/entity-select";
import { useZodForm } from "@/hooks/use-zod-form";
import { ActionFailure, errorMessage } from "@/lib/action-result";
import { centsToPen, formatPen, penToCents } from "@/lib/money";
import { useCategories } from "@/modules/categories/hooks/use-categories";

import {
  budgetFormSchema,
  toBudgetCreateInput,
  toBudgetUpdateInput,
  type BudgetFormValues,
} from "../schemas/budget.schema";
import type { BudgetListItem } from "../types/budget.types";
import { useSaveBudget } from "./use-budget-mutations";

type Options = {
  month: string;
  /** Budget being edited; without it a new one is created. */
  budget?: BudgetListItem;
  /** Category preselected when creating (from the "sin presupuesto" list). */
  presetCategoryId?: string;
  /** Categories that already have a budget this month (not offered again). */
  budgetedCategoryIds: string[];
  onSuccess: () => void;
};

export function useBudgetForm({
  month,
  budget,
  presetCategoryId,
  budgetedCategoryIds,
  onSuccess,
}: Options) {
  const save = useSaveBudget();
  const categoriesQuery = useCategories(false);

  // Only active expense categories without a budget this month.
  const categoryOptions: SelectOption[] = (categoriesQuery.data ?? [])
    .filter((c) => c.kind === "expense" && !budgetedCategoryIds.includes(c.id))
    .map((c) => ({ id: c.id, name: c.name }));

  const defaults: BudgetFormValues = budget
    ? { categoryId: budget.categoryId, amount: centsToPen(budget.amountCents) }
    : { categoryId: "", amount: "" };

  const { form, applyServerError, submitError } = useZodForm(budgetFormSchema, defaults);

  // The categories load after the first render, so the preset one is applied
  // once they are known (the form only reads its defaults at the start). It
  // never overrides a choice the user already made.
  const presetApplied = useRef(false);
  useEffect(() => {
    if (budget || !presetCategoryId || presetApplied.current || !categoriesQuery.data) return;
    presetApplied.current = true;
    const offered = categoriesQuery.data.some(
      (c) => c.id === presetCategoryId && c.kind === "expense" && !budgetedCategoryIds.includes(c.id),
    );
    if (offered && !form.getValues("categoryId")) form.setValue("categoryId", presetCategoryId);
  }, [budget, presetCategoryId, categoriesQuery.data, budgetedCategoryIds, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (budget) {
        await save.mutateAsync({ id: budget.id, input: toBudgetUpdateInput(values) });
      } else {
        await save.mutateAsync({ input: toBudgetCreateInput(values, month) });
      }
    } catch (error) {
      applyServerError({
        message: errorMessage(error),
        fieldErrors: error instanceof ActionFailure ? error.fieldErrors : undefined,
      });
      return;
    }

    const name = budget
      ? budget.categoryName
      : (categoriesQuery.data?.find((c) => c.id === values.categoryId)?.name ?? "Presupuesto");
    toast.success(`Presupuesto guardado · ${name}: ${formatPen(penToCents(values.amount) ?? 0)}`);
    onSuccess();
  });

  return {
    form,
    categoryOptions,
    isLoadingOptions: categoriesQuery.isPending,
    // Nothing left to budget: every expense category already has one.
    allBudgeted: !categoriesQuery.isPending && !budget && categoryOptions.length === 0,
    categoryName: budget?.categoryName,
    onSubmit,
    submitError,
    isPending: save.isPending,
    isEditing: Boolean(budget),
  };
}
