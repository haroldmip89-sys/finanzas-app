import { z } from "zod";

import { isValidDateString } from "@/lib/dates";

/** Largest amount accepted, in cents: S/ 1,000,000,000.00. */
export const MAX_CENTS = 1_000_000_000_00;

const MIN_DATE = "2000-01-01";

/** A real calendar day "YYYY-MM-DD", not before the year 2000. */
export const dateString = z
  .string("Fecha inválida")
  .refine(isValidDateString, "Fecha inválida")
  .refine((v) => v >= MIN_DATE, "La fecha no puede ser anterior al año 2000");

/** Optional note: trimmed, up to 280 characters, empty becomes null. */
export const noteInput = z
  .string()
  .trim()
  .max(280, "Máximo 280 caracteres")
  .nullish()
  .transform((v) => (v ? v : null));
