"use server";

import { requireUserId } from "@/lib/auth";
import { runAction } from "@/lib/run-action";
import type { ActionResult } from "@/lib/action-result";

import {
  transactionFiltersSchema,
  transactionIdSchema,
  transactionInputSchema,
} from "../schemas/transaction.schema";
import { transactionsService } from "../services/transactions.service";
import { z } from "zod";

import type {
  FrequentCategory,
  Transaction,
  TransactionPage,
} from "../types/transaction.types";

export async function listTransactionsAction(
  filters?: unknown,
): Promise<ActionResult<TransactionPage>> {
  return runAction(async () => {
    const userId = await requireUserId();
    return transactionsService.list(userId, transactionFiltersSchema.parse(filters ?? {}));
  });
}

export async function createTransactionAction(
  input: unknown,
): Promise<ActionResult<Transaction>> {
  return runAction(async () => {
    const userId = await requireUserId();
    return transactionsService.create(userId, transactionInputSchema.parse(input));
  });
}

export async function updateTransactionAction(
  id: unknown,
  input: unknown,
): Promise<ActionResult<Transaction>> {
  return runAction(async () => {
    const userId = await requireUserId();
    return transactionsService.update(
      userId,
      transactionIdSchema.parse(id),
      transactionInputSchema.parse(input),
    );
  });
}

export async function deleteTransactionAction(
  id: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const userId = await requireUserId();
    await transactionsService.remove(userId, transactionIdSchema.parse(id));
    return null;
  });
}

const frequentCategoriesSchema = z.enum(["income", "expense"]);

export async function listFrequentCategoriesAction(
  type: unknown,
): Promise<ActionResult<FrequentCategory[]>> {
  return runAction(async () => {
    const userId = await requireUserId();
    return transactionsService.frequentCategories(userId, frequentCategoriesSchema.parse(type));
  });
}
