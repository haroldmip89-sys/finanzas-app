import { z } from "zod";

import { centsToPen, penToCents } from "@/lib/money";
import { MAX_CENTS } from "@/lib/validation";

export const ACCOUNT_TYPES = ["cash", "bank", "card", "wallet"] as const;

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
  // false = reserve (not counted as available money). Cards ignore it.
  includeInAvailable: z.boolean().optional(),
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
  includeInAvailable: z.boolean().optional(),
});

export const accountIdSchema = z.uuid("Identificador inválido");

export const listAccountsSchema = z.object({
  includeArchived: z.boolean().default(false),
});

export type AccountInput = z.infer<typeof accountInputSchema>;
export type AccountFormValues = z.infer<typeof accountFormSchema>;

/**
 * A card's balance is a debt: the user types it as a positive number and it is
 * stored as a negative balance. Other accounts keep the sign as typed.
 */
function signedBalance(type: AccountInput["type"], typedCents: number): number {
  return type === "card" && typedCents !== 0 ? -typedCents : typedCents;
}

/** Converts validated form values to the server contract. */
export function toAccountInput(values: AccountFormValues): AccountInput {
  const typed = values.initialBalance === "" ? 0 : (penToCents(values.initialBalance) ?? 0);
  return {
    name: values.name,
    type: values.type,
    initialBalanceCents: signedBalance(values.type, typed),
    // A card is debt, never available money: it always counts as "included".
    includeInAvailable: values.type === "card" ? true : values.includeInAvailable,
  };
}

/** The initial balance as the form shows it (a card's debt is positive). */
export function balanceToFormValue(type: AccountInput["type"], balanceCents: number): string {
  return centsToPen(signedBalance(type, balanceCents));
}
