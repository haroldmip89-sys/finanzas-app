import { z } from "zod";

import { isValidMonthKey } from "@/lib/dates";
import { penToCents } from "@/lib/money";
import { MAX_CENTS } from "@/lib/validation";

const cents = (label: string) =>
  z
    .number(`${label} inválido`)
    .int(`${label} inválido`)
    .min(1, `${label} debe ser mayor a 0`)
    .max(MAX_CENTS, "Monto fuera de rango");

/** Server contract. */
export const installmentCreateSchema = z.object({
  accountId: z.uuid("Elige una tarjeta"),
  name: z.string("Nombre inválido").trim().min(1, "Escribe un nombre").max(80, "Máximo 80 caracteres"),
  principalCents: cents("Monto"),
  installmentCount: z
    .number("Número de cuotas inválido")
    .int("Número de cuotas inválido")
    .min(2, "Mínimo 2 cuotas")
    .max(60, "Máximo 60 cuotas"),
  installmentCents: cents("Monto"),
  firstDueMonth: z.string("Mes inválido").refine(isValidMonthKey, "Mes inválido"),
});

export const installmentIdSchema = z.uuid("Identificador inválido");

const pen = (message: string) =>
  z.string().trim().refine((v) => {
    const c = penToCents(v);
    return c !== null && c > 0;
  }, message);

/** Form contract: amounts typed in PEN, count as text. */
export const installmentFormSchema = z.object({
  accountId: z.string().min(1, "Elige una tarjeta"),
  name: z.string().trim().min(1, "Escribe un nombre").max(80, "Máximo 80 caracteres"),
  principal: pen("Ingresa el precio de la compra, ej. 1200.00"),
  count: z.string().trim().regex(/^\d+$/, "Ingresa un número entero").refine((v) => Number(v) >= 2 && Number(v) <= 60, "Entre 2 y 60 cuotas"),
  installment: pen("Ingresa el importe de la cuota, ej. 110.00"),
  firstDueMonth: z.string().refine(isValidMonthKey, "Elige un mes"),
});

export type InstallmentCreateInput = z.infer<typeof installmentCreateSchema>;
export type InstallmentFormValues = z.infer<typeof installmentFormSchema>;

export function toInstallmentCreateInput(v: InstallmentFormValues): InstallmentCreateInput {
  return {
    accountId: v.accountId,
    name: v.name,
    principalCents: penToCents(v.principal) ?? 0,
    installmentCount: Number(v.count),
    installmentCents: penToCents(v.installment) ?? 0,
    firstDueMonth: v.firstDueMonth,
  };
}
