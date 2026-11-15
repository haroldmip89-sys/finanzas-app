import { z } from "zod";

import { penToCents } from "@/lib/money";

export const ACCOUNT_TYPES = ["cash", "bank", "card", "wallet"] as const;

const MAX_CENTS = 1_000_000_000_00; // S/ 1,000,000,000.00

const name = z
  .string()
  .trim()
  .min(1, "El nombre es obligatorio")
  .max(50, "Máximo 50 caracteres");

const type = z.enum(ACCOUNT_TYPES, { error: "Elige un tipo de cuenta" });

/** Server contract: the balance travels as integer cents of PEN. */
export const accountInputSchema = z.object({
  name,
  type,
  initialBalanceCents: z
    .number("Monto inválido")
    .int("Monto inválido")
    .min(-MAX_CENTS, "Monto fuera de rango")
    .max(MAX_CENTS, "Monto fuera de rango"),
});

/** Form contract: the user types the balance in PEN ("12.50"). */
export const accountFormSchema = z.object({
  name,
  type,
  initialBalance: z
    .string()
    .trim()
    // Empty means 0 (the field only shows a placeholder).
    .refine(
      (v) => v === "" || penToCents(v) !== null,
      "Ingresa un monto válido, ej. 120.50",
    ),
});

export const accountIdSchema = z.uuid("Identificador inválido");

export const listAccountsSchema = z.object({
  includeArchived: z.boolean().default(false),
});

export type AccountInput = z.infer<typeof accountInputSchema>;
export type AccountFormValues = z.infer<typeof accountFormSchema>;

/** Converts validated form values to the server contract. */
export function toAccountInput(values: AccountFormValues): AccountInput {
  return {
    name: values.name,
    type: values.type,
    initialBalanceCents:
      values.initialBalance === "" ? 0 : (penToCents(values.initialBalance) ?? 0),
  };
}
