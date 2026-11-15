import { z } from "zod";

import { penToCents } from "@/lib/money";
import { MAX_CENTS, dateString, noteInput } from "@/lib/validation";

const DIFFERENT_ACCOUNTS = "Elige una cuenta distinta al origen";

/** Server contract: amount in integer cents, optional note normalized to null. */
export const transferInputSchema = z
  .object({
    fromAccountId: z.uuid("Elige la cuenta de origen"),
    toAccountId: z.uuid("Elige la cuenta de destino"),
    amountCents: z
      .number("Monto inválido")
      .int("Monto inválido")
      .min(1, "El monto debe ser mayor a 0")
      .max(MAX_CENTS, "Monto fuera de rango"),
    date: dateString,
    note: noteInput,
  })
  .refine((t) => t.fromAccountId !== t.toAccountId, {
    path: ["toAccountId"],
    message: DIFFERENT_ACCOUNTS,
  });

/** Form contract: the user types the amount in PEN ("12.50"). */
export const transferFormSchema = z
  .object({
    fromAccountId: z.string().min(1, "Elige la cuenta de origen"),
    toAccountId: z.string().min(1, "Elige la cuenta de destino"),
    amount: z.string().trim().refine((v) => {
      const cents = penToCents(v);
      return cents !== null && cents > 0;
    }, "Ingresa un monto mayor a 0, ej. 100.00"),
    date: dateString,
    note: z.string().trim().max(280, "Máximo 280 caracteres"),
  })
  .refine((t) => !t.fromAccountId || t.fromAccountId !== t.toAccountId, {
    path: ["toAccountId"],
    message: DIFFERENT_ACCOUNTS,
  });

export const transferIdSchema = z.uuid("Identificador inválido");

export const transferFiltersSchema = z
  .object({
    from: dateString.optional(),
    to: dateString.optional(),
    accountId: z.uuid().optional(),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(20),
  })
  .refine((f) => !f.from || !f.to || f.from <= f.to, {
    path: ["to"],
    message: "La fecha final no puede ser anterior a la inicial",
  });

export type TransferInput = z.infer<typeof transferInputSchema>;
export type TransferFormValues = z.infer<typeof transferFormSchema>;
export type TransferFilters = z.input<typeof transferFiltersSchema>;

/** Converts validated form values to the server contract. */
export function toTransferInput(values: TransferFormValues): TransferInput {
  return {
    fromAccountId: values.fromAccountId,
    toAccountId: values.toAccountId,
    amountCents: penToCents(values.amount) ?? 0,
    date: values.date,
    note: values.note === "" ? null : values.note,
  };
}
