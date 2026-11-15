import {
  Banknote,
  Briefcase,
  Car,
  CircleEllipsis,
  Dumbbell,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  PiggyBank,
  Plane,
  Shirt,
  ShoppingBag,
  Smartphone,
  Tag,
  Utensils,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";

import {
  DEFAULT_CATEGORY_ICON,
  type CategoryIconKey,
} from "../constants/category-icon-keys";

export const CATEGORY_ICONS: Record<CategoryIconKey, LucideIcon> = {
  utensils: Utensils,
  car: Car,
  house: House,
  zap: Zap,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  gamepad: Gamepad2,
  "shopping-bag": ShoppingBag,
  wallet: Wallet,
  briefcase: Briefcase,
  banknote: Banknote,
  "piggy-bank": PiggyBank,
  gift: Gift,
  plane: Plane,
  shirt: Shirt,
  smartphone: Smartphone,
  dumbbell: Dumbbell,
  landmark: Landmark,
  tag: Tag,
  ellipsis: CircleEllipsis,
};

/** Resolves a stored icon key to its component, falling back to the default. */
export function getCategoryIcon(key: string | null | undefined): LucideIcon {
  return CATEGORY_ICONS[(key ?? DEFAULT_CATEGORY_ICON) as CategoryIconKey] ?? Tag;
}
