import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

import { BrandLogo } from "@/components/shared/brand-logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { QuickAddNewButton } from "@/modules/quick-add/components/quick-add-new-button";

import { navItems, settingsItem } from "../nav-items";
import { NavLink } from "./nav-link";

/** Rail (88 px, icons over labels) from 768 px; full menu (232 px) from 1024 px. */
export function AppSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-22 flex-col border-r border-sidebar-border bg-sidebar px-2 py-5 text-sidebar-foreground md:flex lg:w-58 lg:px-3">
      <Link
        href="/dashboard"
        aria-label="Yupi! · Inicio"
        className="mb-5 flex justify-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring lg:justify-start lg:px-2"
      >
        <BrandLogo nameClassName="hidden lg:inline" />
      </Link>
      <div className="mb-3">
        <QuickAddNewButton />
      </div>
      <nav aria-label="Principal" className="flex-1 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            matches={item.matches}
            icon={<item.icon aria-hidden="true" className="size-5" />}
            variant="sidebar"
          />
        ))}
      </nav>
      <div className="mt-2 space-y-1 border-t border-sidebar-border pt-2">
        <NavLink
          href={settingsItem.href}
          label={settingsItem.label}
          matches={settingsItem.matches}
          icon={<settingsItem.icon aria-hidden="true" className="size-5" />}
          variant="sidebar"
        />
      </div>
      <div className="mt-2 flex flex-col items-center gap-3 border-t border-sidebar-border pt-3 lg:flex-row lg:justify-between lg:px-1">
        <UserButton />
        <ThemeToggle />
      </div>
    </aside>
  );
}
