import type { CategoryIconKey } from "./category-icon-keys";

export type DefaultCategory = {
  name: string;
  kind: "income" | "expense";
  icon: CategoryIconKey;
};

// Seeded once per user, only when the user has no categories at all.
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: "Alimentación", kind: "expense", icon: "utensils" },
  { name: "Transporte", kind: "expense", icon: "car" },
  { name: "Vivienda", kind: "expense", icon: "house" },
  { name: "Servicios", kind: "expense", icon: "zap" },
  { name: "Salud", kind: "expense", icon: "heart-pulse" },
  { name: "Educación", kind: "expense", icon: "graduation-cap" },
  { name: "Entretenimiento", kind: "expense", icon: "gamepad" },
  { name: "Compras", kind: "expense", icon: "shopping-bag" },
  { name: "Otros gastos", kind: "expense", icon: "ellipsis" },
  { name: "Sueldo", kind: "income", icon: "wallet" },
  { name: "Negocio", kind: "income", icon: "briefcase" },
  { name: "Otros ingresos", kind: "income", icon: "banknote" },
];
