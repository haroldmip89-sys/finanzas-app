import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

import { ThemeToggle } from "@/components/shared/theme-toggle";

import { navItems } from "../nav-items";
import { NavLink } from "./nav-link";

export function AppSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-14 items-center px-4">
        <Link href="/dashboard" className="text-base font-semibold">
          Finanzas
        </Link>
      </div>
      <nav aria-label="Principal" className="flex-1 space-y-1 px-2 py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={<item.icon aria-hidden="true" className="size-5" />}
            variant="sidebar"
          />
        ))}
      </nav>
      <div className="flex items-center justify-between border-t border-sidebar-border p-3">
        <UserButton />
        <ThemeToggle />
      </div>
    </aside>
  );
}
