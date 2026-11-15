import { z } from "zod";

import { penToCents } from "@/lib/money";
import { MAX_CENTS, dateString, noteInput } from "@/lib/validation";

const amountCents = z
  .number("Monto inválido")
  .int("Monto inválido")
  .min(1, "El monto debe ser mayor a 0")
  .max(MAX_CENTS, "Monto fuera de rango");

export const avoidedReasonSchema = z.enum(["not_needed", "over_budget", "can_wait", "other"]);

/** Server contract. `postponed` may carry the moment to decide again. */
export const avoidedCreateSchema = z.object({
  amountCents,
  date: dateString,
  categoryId: z.uuid("Categoría inválida").nullable().optional(),
  reason: avoidedReasonSchema.nullable().optional(),
  note: noteInput,
  status: z.enum(["avoided", "postponed"]).default("avoided"),
  revisitAt: z.iso.datetime("Fecha inválida").nullable().optional(),
});

export const avoidedIdSchema = z.uuid("Identificador inválido");

export const REASON_LABELS: Record<z.infer<typeof avoidedReasonSchema>, string> = {
  not_needed: "No la necesito",
  over_budget: "Fuera de presupuesto",
  can_wait: "Puedo esperar",
  other: "Otro",
};

/** Form contract: the user types the amount in PEN. */
export const avoidedFormSchema = z.object({
  amount: z.string().trim().refine((v) => {
    const cents = penToCents(v);
    return cents !== null && cents > 0;
  }, "Ingresa un monto mayor a 0, ej. 150.00"),
  categoryId: z.string(),
  reason: z.string(),
  date: dateString,
  note: z.string().max(280, "Máximo 280 caracteres"),
});

export type AvoidedCreateInput = z.input<typeof avoidedCreateSchema>;
export type AvoidedFormValues = z.infer<typeof avoidedFormSchema>;

export function toAvoidedCreateInput(values: AvoidedFormValues): AvoidedCreateInput {
  return {
    amountCents: penToCents(values.amount) ?? 0,
    date: values.date,
    categoryId: values.categoryId || null,
    reason: values.reason ? avoidedReasonSchema.parse(values.reason) : null,
    note: values.note,
    status: "avoided",
  };
}
