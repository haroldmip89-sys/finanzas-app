import { z } from "zod";

import { isValidMonthKey } from "@/lib/dates";
import { penToCents } from "@/lib/money";
import { MAX_CENTS, dateString } from "@/lib/validation";

export const AVOIDED_NOTE_MAX = 120;

const REASONS = ["not_needed", "out_of_budget", "can_wait", "other"] as const;
const STATUSES = ["avoided", "postponed"] as const;

const amountCents = z
  .number("Monto inválido")
  .int("Monto inválido")
  .min(1, "El monto debe ser mayor a 0")
  .max(MAX_CENTS, "Monto fuera de rango");

/** Optional note: trimmed, up to 120 characters, empty becomes null. */
const note = z
  .string()
  .trim()
  .max(AVOIDED_NOTE_MAX, `Máximo ${AVOIDED_NOTE_MAX} caracteres`)
  .nullish()
  .transform((v) => (v ? v : null));

const status = z.enum(STATUSES, { error: "Estado inválido" });

/** Server contract: only the amount is required; the rest is optional. */
export const avoidedInputSchema = z.object({
  amountCents,
  date: dateString,
  categoryId: z.uuid("Categoría inválida").nullish().transform((v) => v ?? null),
  reason: z.enum(REASONS, { error: "Motivo inválido" }).nullish().transform((v) => v ?? null),
  note,
  status: status.default("avoided"),
});

export const avoidedIdSchema = z.uuid("Identificador inválido");
export const avoidedStatusSchema = status;
export const avoidedMonthSchema = z
  .string("Mes inválido")
  .refine(isValidMonthKey, "Mes inválido");

/** Form contract: the user types the amount in PEN; "" means "none". */
export const avoidedFormSchema = z.object({
  amount: z.string().trim().refine((v) => {
    const cents = penToCents(v);
    return cents !== null && cents > 0;
  }, "Ingresa un monto mayor a 0, ej. 89.90"),
  date: dateString,
  categoryId: z.string(),
  reason: z.union([z.enum(REASONS), z.literal("")]),
  note: z.string().trim().max(AVOIDED_NOTE_MAX, `Máximo ${AVOIDED_NOTE_MAX} caracteres`),
  status,
});

export type AvoidedInput = z.input<typeof avoidedInputSchema>;
export type AvoidedData = z.output<typeof avoidedInputSchema>;
export type AvoidedFormValues = z.infer<typeof avoidedFormSchema>;

/** Converts validated form values to the server contract. */
export function toAvoidedInput(values: AvoidedFormValues): AvoidedInput {
  return {
    amountCents: penToCents(values.amount) ?? 0,
    date: values.date,
    categoryId: values.categoryId || null,
    reason: values.reason || null,
    note: values.note || null,
    status: values.status,
  };
}
