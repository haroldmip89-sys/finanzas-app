import {
  ArrowLeftRight,
  LayoutDashboard,
  Receipt,
  Tags,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  /** Shorter label for the bottom bar, where space is tight. */
  shortLabel?: string;
  icon: LucideIcon;
};

// Cada spec de módulo agrega aquí su entrada cuando su ruta exista.
export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transacciones", shortLabel: "Movimientos", icon: Receipt },
  { href: "/transfers", label: "Transferencias", shortLabel: "Transferir", icon: ArrowLeftRight },
  { href: "/accounts", label: "Cuentas", icon: Wallet },
  { href: "/categories", label: "Categorías", icon: Tags },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
