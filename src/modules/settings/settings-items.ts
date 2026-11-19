import { ShieldCheck, Tags, type LucideIcon } from "lucide-react";

export type SettingsItem = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

// Future settings (reserves, planning period, mindful purchase) are added here.
export const settingsItems: SettingsItem[] = [
  {
    href: "/categories",
    title: "Categorías",
    description: "Organiza tus ingresos y gastos.",
    icon: Tags,
  },
  {
    href: "/avoided",
    title: "Compras evitadas",
    description: "Lo que decidiste no gastar.",
    icon: ShieldCheck,
  },
];
