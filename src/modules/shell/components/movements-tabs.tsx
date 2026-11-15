"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { isActive } from "../nav-items";

const TABS = [
  { href: "/transactions", label: "Transacciones" },
  { href: "/transfers", label: "Transferencias" },
];

/** Tab strip shared by the transactions and transfers pages. */
export function MovementsTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Movimientos" className="flex gap-1 rounded-lg bg-muted p-1">
      {TABS.map((tab) => {
        const active = isActive(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 flex-1 items-center justify-center rounded-md px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 sm:min-h-9 sm:flex-none",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
