"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { isItemActive } from "../nav-items";

type NavLinkProps = {
  href: string;
  label: string;
  /** Other routes that also mark this link as active. */
  matches?: string[];
  // Rendered by the server component: components (functions) cannot cross
  // the server/client boundary, elements can.
  icon: ReactNode;
  variant: "sidebar" | "bottom";
};

export function NavLink({ href, label, matches, icon, variant }: NavLinkProps) {
  const pathname = usePathname();
  const active = isItemActive(pathname, { href, matches });

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
        variant === "sidebar" &&
          "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium",
        variant === "bottom" &&
          "flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium",
        variant === "sidebar" &&
          (active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"),
        variant === "bottom" &&
          (active
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"),
      )}
    >
      {icon}
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}
