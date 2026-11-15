import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

import { BrandLogo } from "@/components/shared/brand-logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-background/95 px-4 backdrop-blur md:hidden">
      <Link
        href="/dashboard"
        aria-label="Yupi! · Inicio"
        className="rounded-xl text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <BrandLogo size={30} nameClassName="text-[17px]" />
      </Link>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <UserButton />
      </div>
    </header>
  );
}
