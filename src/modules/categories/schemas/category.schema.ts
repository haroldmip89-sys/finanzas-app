import { z } from "zod";

import { CATEGORY_ICON_KEYS } from "../constants/category-icon-keys";

const name = z
  .string()
  .trim()
  .min(1, "El nombre es obligatorio")
  .max(40, "Máximo 40 caracteres");

const icon = z.enum(CATEGORY_ICON_KEYS, { error: "Elige un icono válido" });

/** Create: the kind is chosen once and can never change afterwards. */
export const categoryCreateSchema = z.object({
  name,
  kind: z.enum(["income", "expense"], { error: "Elige un tipo" }),
  icon,
});

/** Update: the kind is not editable. */
export const categoryUpdateSchema = z.object({ name, icon });

export const categoryIdSchema = z.uuid("Identificador inválido");

export const listCategoriesSchema = z.object({
  includeArchived: z.boolean().default(false),
});

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
