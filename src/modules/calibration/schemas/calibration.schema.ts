import { z } from "zod";

import { penToCents } from "@/lib/money";
import { MAX_CENTS } from "@/lib/validation";

/** Server contract: the real balance travels as signed integer cents of PEN. */
export const calibrationInputSchema = z.object({
  accountId: z.uuid("Elige una cuenta"),
  realBalanceCents: z
    .number("Monto inválido")
    .int("Monto inválido")
    .min(-MAX_CENTS, "Monto fuera de rango")
    .max(MAX_CENTS, "Monto fuera de rango"),
});

/** Form contract: the user types the real balance in PEN ("820.00" or "-150"). */
export const calibrationFormSchema = z.object({
  accountId: z.string().min(1, "Elige una cuenta"),
  realBalance: z
    .string()
    .trim()
    .refine((v) => v !== "" && penToCents(v) !== null, "Ingresa un monto válido, ej. 820.00"),
});

export type CalibrationInput = z.infer<typeof calibrationInputSchema>;
export type CalibrationFormValues = z.infer<typeof calibrationFormSchema>;

/** Converts validated form values to the server contract. */
export function toCalibrationInput(values: CalibrationFormValues): CalibrationInput {
  return {
    accountId: values.accountId,
    realBalanceCents: penToCents(values.realBalance) ?? 0,
  };
}
