import { z } from "zod";

import { isValidDateString } from "@/lib/dates";
import { penToCents } from "@/lib/money";

const MAX_CENTS = 1_000_000_000_00; // S/ 1,000,000,000.00
const MIN_DATE = "2000-01-01";

const type = z.enum(["income", "expense"], { error: "Elige un tipo" });

const dateString = z
  .string("Fecha inválida")
  .refine(isValidDateString, "Fecha inválida")
  .refine((v) => v >= MIN_DATE, "La fecha no puede ser anterior al año 2000");

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
  note: z
    .string()
    .trim()
    .max(280, "Máximo 280 caracteres")
    .nullish()
    .transform((v) => (v ? v : null)),
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
