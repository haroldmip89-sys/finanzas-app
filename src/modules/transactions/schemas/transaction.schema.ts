import { z } from "zod";

import { penToCents } from "@/lib/money";
import { MAX_CENTS, dateString, noteInput } from "@/lib/validation";

const type = z.enum(["income", "expense"], { error: "Elige un tipo" });

/** Server contract: amount in integer cents, optional note normalized to null. */
export const transactionInputSchema = z.object({
  type,
  accountId: z.uuid("Elige una cuenta"),
  categoryId: z.uuid("Elige una categoría"),
  amountCents: z
    .number("Monto inválido")
    .int("Monto inválido")
    .min(1, "El monto debe ser mayor a 0")
    .max(MAX_CENTS, "Monto fuera de rango"),
  date: dateString,
  note: noteInput,
});

/** Form contract: the user types the amount in PEN ("12.50"). */
export const transactionFormSchema = z.object({
  type,
  accountId: z.string().min(1, "Elige una cuenta"),
  categoryId: z.string().min(1, "Elige una categoría"),
  amount: z.string().trim().refine((v) => {
    const cents = penToCents(v);
    return cents !== null && cents > 0;
  }, "Ingresa un monto mayor a 0, ej. 25.50"),
  date: dateString,
  note: z.string().trim().max(280, "Máximo 280 caracteres"),
});

export const transactionIdSchema = z.uuid("Identificador inválido");

export const transactionFiltersSchema = z
  .object({
    from: dateString.optional(),
    to: dateString.optional(),
    type: type.optional(),
    accountId: z.uuid().optional(),
    categoryId: z.uuid().optional(),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(20),
  })
  .refine((f) => !f.from || !f.to || f.from <= f.to, {
    path: ["to"],
    message: "La fecha final no puede ser anterior a la inicial",
  });

export type TransactionInput = z.infer<typeof transactionInputSchema>;
export type TransactionFormValues = z.infer<typeof transactionFormSchema>;
export type TransactionFilters = z.input<typeof transactionFiltersSchema>;

/** Converts validated form values to the server contract. */
export function toTransactionInput(values: TransactionFormValues): TransactionInput {
  return {
    type: values.type,
    accountId: values.accountId,
    categoryId: values.categoryId,
    amountCents: penToCents(values.amount) ?? 0,
    date: values.date,
    note: values.note === "" ? null : values.note,
  };
}
