import { z } from "zod";

import { isValidMonthKey } from "@/lib/dates";
import { penToCents } from "@/lib/money";
import { MAX_CENTS } from "@/lib/validation";

/** A month as "YYYY-MM". */
export const monthSchema = z.string("Mes inválido").refine(isValidMonthKey, "Mes inválido");

const amountCents = z
  .number("Monto inválido")
  .int("Monto inválido")
  .min(1, "El monto debe ser mayor a 0")
  .max(MAX_CENTS, "Monto fuera de rango");

/** Server contract: a budget is a category + a month + an amount in cents. */
export const budgetCreateSchema = z.object({
  categoryId: z.uuid("Elige una categoría"),
  month: monthSchema,
  amountCents,
});

/** Only the amount can change: the category and the month are fixed. */
export const budgetUpdateSchema = z.object({ amountCents });

export const budgetIdSchema = z.uuid("Identificador inválido");

export const listBudgetsSchema = z.object({ month: monthSchema });

/** Form contract: the user types the amount in PEN ("200.00"). */
export const budgetFormSchema = z.object({
  categoryId: z.string().min(1, "Elige una categoría"),
  amount: z.string().trim().refine((v) => {
    const cents = penToCents(v);
    return cents !== null && cents > 0;
  }, "Ingresa un monto mayor a 0, ej. 300.00"),
});

export type BudgetCreateInput = z.infer<typeof budgetCreateSchema>;
export type BudgetUpdateInput = z.infer<typeof budgetUpdateSchema>;
export type BudgetFormValues = z.infer<typeof budgetFormSchema>;

/** Converts validated form values to the create contract. */
export function toBudgetCreateInput(
  values: BudgetFormValues,
  month: string,
): BudgetCreateInput {
  return {
    categoryId: values.categoryId,
    month,
    amountCents: penToCents(values.amount) ?? 0,
  };
}

/** Converts validated form values to the update contract. */
export function toBudgetUpdateInput(values: BudgetFormValues): BudgetUpdateInput {
  return { amountCents: penToCents(values.amount) ?? 0 };
}
