import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

import { ThemeToggle } from "@/components/shared/theme-toggle";

import { SettingsLink } from "./settings-link";

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background px-4 md:hidden">
      <Link href="/dashboard" className="text-base font-semibold text-foreground">
        Finanzas
      </Link>
      <div className="flex items-center gap-2">
        <SettingsLink />
        <ThemeToggle />
        <UserButton />
      </div>
    </header>
  );
}
