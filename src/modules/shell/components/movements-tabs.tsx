"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { isActive } from "../nav-items";

const TABS = [
  { href: "/transactions", label: "Transacciones" },
  { href: "/transfers", label: "Transferencias" },
];

/** Tab strip shared by the transactions and transfers pages (underline style). */
export function MovementsTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Movimientos" className="flex border-b border-border">
      {TABS.map((tab) => {
        const active = isActive(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-h-11 flex-1 items-center justify-center px-4 text-[15px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring sm:flex-none",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary transition-opacity",
                active ? "opacity-100" : "opacity-0",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
