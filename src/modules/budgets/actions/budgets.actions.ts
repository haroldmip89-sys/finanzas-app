"use server";

import { requireUserId } from "@/lib/auth";
import { runAction } from "@/lib/run-action";
import type { ActionResult } from "@/lib/action-result";

import {
  budgetCreateSchema,
  budgetIdSchema,
  budgetUpdateSchema,
  monthSchema,
} from "../schemas/budget.schema";
import { budgetsService } from "../services/budgets.service";
import type { Budget, BudgetsOverview } from "../types/budget.types";

export async function listBudgetsAction(month: unknown): Promise<ActionResult<BudgetsOverview>> {
  return runAction(async () => {
    const userId = await requireUserId();
    return budgetsService.list(userId, monthSchema.parse(month));
  });
}

export async function createBudgetAction(input: unknown): Promise<ActionResult<Budget>> {
  return runAction(async () => {
    const userId = await requireUserId();
    return budgetsService.create(userId, budgetCreateSchema.parse(input));
  });
}

export async function updateBudgetAction(
  id: unknown,
  input: unknown,
): Promise<ActionResult<Budget>> {
  return runAction(async () => {
    const userId = await requireUserId();
    return budgetsService.update(userId, budgetIdSchema.parse(id), budgetUpdateSchema.parse(input));
  });
}

export async function deleteBudgetAction(id: unknown): Promise<ActionResult<null>> {
  return runAction(async () => {
    const userId = await requireUserId();
    await budgetsService.remove(userId, budgetIdSchema.parse(id));
    return null;
  });
}

export async function copyBudgetsFromPreviousMonthAction(
  month: unknown,
): Promise<ActionResult<{ created: number }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    return budgetsService.copyFromPreviousMonth(userId, monthSchema.parse(month));
  });
}
