import { navItems } from "../nav-items";
import { NavLink } from "./nav-link";

export function BottomNav() {
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {navItems.map((item) => (
        <NavLink
            key={item.href}
            href={item.href}
            label={item.shortLabel ?? item.label}
            icon={<item.icon aria-hidden="true" className="size-5" />}
            variant="bottom"
          />
      ))}
    </nav>
  );
}
