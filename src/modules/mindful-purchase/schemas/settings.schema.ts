import { z } from "zod";

import { penToCents } from "@/lib/money";
import { MAX_CENTS } from "@/lib/validation";

import { pauseMinutesSchema } from "@/modules/avoided-purchases/schemas/avoided.schema";

export const DEFAULT_MINDFUL_SETTINGS = {
  enabled: true,
  thresholdCents: 10000,
  pauseMinutes: 1440 as 10 | 1440,
};

/** Server contract. */
export const mindfulSettingsSchema = z.object({
  enabled: z.boolean("Valor inválido"),
  thresholdCents: z
    .number("Monto inválido")
    .int("Monto inválido")
    .min(1, "El umbral debe ser mayor a 0")
    .max(MAX_CENTS, "Monto fuera de rango"),
  pauseMinutes: pauseMinutesSchema,
});

/** Form contract: the threshold is typed in PEN ("100.00"). */
export const mindfulSettingsFormSchema = z.object({
  enabled: z.boolean(),
  threshold: z.string().trim().refine((v) => {
    const cents = penToCents(v);
    return cents !== null && cents > 0;
  }, "Ingresa un monto mayor a 0, ej. 100.00"),
  pauseMinutes: pauseMinutesSchema,
});

export type MindfulSettings = z.infer<typeof mindfulSettingsSchema>;
export type MindfulSettingsFormValues = z.infer<typeof mindfulSettingsFormSchema>;

export function toMindfulSettings(values: MindfulSettingsFormValues): MindfulSettings {
  return {
    enabled: values.enabled,
    thresholdCents: penToCents(values.threshold) ?? 0,
    pauseMinutes: values.pauseMinutes,
  };
}
