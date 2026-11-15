import {
  ChartNoAxesColumn,
  LayoutDashboard,
  Receipt,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Other routes that also mark this destination as active. */
  matches?: string[];
};

// Cada spec agrega aquí su destino cuando exista.
export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/transactions", label: "Movimientos", icon: Receipt, matches: ["/transfers"] },
  { href: "/accounts", label: "Cuentas", icon: Wallet },
  { href: "/analysis", label: "Análisis", icon: ChartNoAxesColumn },
];

// Ajustes no va en la barra inferior: se llega con el engranaje o el menú lateral.
export const settingsItem: NavItem = {
  href: "/settings",
  label: "Ajustes",
  icon: Settings,
  matches: ["/categories"],
};

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** True when the route is the item's own or one of its extra routes. */
export function isItemActive(
  pathname: string,
  item: { href: string; matches?: string[] },
): boolean {
  return [item.href, ...(item.matches ?? [])].some((href) => isActive(pathname, href));
}
