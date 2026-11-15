import { z } from "zod";

import { penToCents } from "@/lib/money";
import { MAX_CENTS } from "@/lib/validation";

/** Server contract. */
export const mindfulSettingsSchema = z.object({
  enabled: z.boolean("Valor inválido"),
  thresholdCents: z
    .number("Monto inválido")
    .int("Monto inválido")
    .min(1, "El umbral debe ser mayor a 0")
    .max(MAX_CENTS, "Monto fuera de rango"),
});

/** Form contract: the threshold is typed in PEN. */
export const mindfulSettingsFormSchema = z.object({
  enabled: z.boolean(),
  threshold: z.string().trim().refine((v) => {
    const cents = penToCents(v);
    return cents !== null && cents > 0;
  }, "Ingresa un monto mayor a 0, ej. 100.00"),
});

export type MindfulSettingsInput = z.infer<typeof mindfulSettingsSchema>;
export type MindfulSettingsFormValues = z.infer<typeof mindfulSettingsFormSchema>;
