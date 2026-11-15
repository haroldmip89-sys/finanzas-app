"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { unwrapResult } from "@/lib/action-result";

import {
  copyBudgetsFromPreviousMonthAction,
  createBudgetAction,
  deleteBudgetAction,
  updateBudgetAction,
} from "../actions/budgets.actions";
import type { BudgetCreateInput, BudgetUpdateInput } from "../schemas/budget.schema";
import { budgetsKey } from "./use-budgets";

function useInvalidateBudgets() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: budgetsKey });
}

type SaveVariables =
  | { id?: undefined; input: BudgetCreateInput }
  | { id: string; input: BudgetUpdateInput };

export function useSaveBudget() {
  const invalidate = useInvalidateBudgets();
  return useMutation({
    mutationFn: async (variables: SaveVariables) =>
      unwrapResult(
        variables.id
          ? await updateBudgetAction(variables.id, variables.input)
          : await createBudgetAction(variables.input),
      ),
    onSuccess: invalidate,
  });
}

export function useDeleteBudget() {
  const invalidate = useInvalidateBudgets();
  return useMutation({
    mutationFn: async (id: string) => unwrapResult(await deleteBudgetAction(id)),
    onSuccess: invalidate,
  });
}

export function useCopyBudgets() {
  const invalidate = useInvalidateBudgets();
  return useMutation({
    mutationFn: async (month: string) =>
      unwrapResult(await copyBudgetsFromPreviousMonthAction(month)),
    onSuccess: invalidate,
  });
}
