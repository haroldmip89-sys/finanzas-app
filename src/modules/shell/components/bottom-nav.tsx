import { bottomNavItems, type NavItem } from "../nav-items";
import { NavLink } from "./nav-link";

/**
 * Five slots: Inicio, Movimientos, [+], Cuentas, Ajustes. The "+" button is
 * the floating QuickAddFab, which sits over the empty centre slot.
 */
export function BottomNav() {
  const [first, second, third, fourth] = bottomNavItems;

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-30 grid h-[calc(72px+env(safe-area-inset-bottom))] grid-cols-5 items-start border-t border-border bg-card pt-2 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <Item item={first} />
      <Item item={second} />
      <span aria-hidden="true" />
      <Item item={third} />
      <Item item={fourth} />
    </nav>
  );
}

function Item({ item }: { item: NavItem }) {
  return (
    <NavLink
      href={item.href}
      label={item.label}
      matches={item.matches}
      icon={<item.icon aria-hidden="true" className="size-[22px]" />}
      variant="bottom"
    />
  );
}
