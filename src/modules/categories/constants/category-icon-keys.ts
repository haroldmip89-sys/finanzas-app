// Fixed set of icon keys stored in categories.icon. The component that maps
// each key to a lucide icon lives in components/category-icon.tsx.
export const CATEGORY_ICON_KEYS = [
  "utensils",
  "car",
  "house",
  "zap",
  "heart-pulse",
  "graduation-cap",
  "gamepad",
  "shopping-bag",
  "wallet",
  "briefcase",
  "banknote",
  "piggy-bank",
  "gift",
  "plane",
  "shirt",
  "smartphone",
  "dumbbell",
  "landmark",
  "tag",
  "ellipsis",
] as const;

export type CategoryIconKey = (typeof CATEGORY_ICON_KEYS)[number];

export const DEFAULT_CATEGORY_ICON: CategoryIconKey = "tag";
