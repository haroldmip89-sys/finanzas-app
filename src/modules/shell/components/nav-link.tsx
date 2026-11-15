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
  /** "sidebar" is a rail (icon over label) from 768 px and a full menu from 1024 px. */
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
        "outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        variant === "sidebar" &&
          "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold lg:min-h-11 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-[15px]",
        variant === "bottom" &&
          "flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0 text-[11px] font-semibold",
        variant === "sidebar" &&
          (active
            ? "bg-primary/12 text-foreground dark:bg-primary/15 [&_svg]:text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"),
        variant === "bottom" &&
          (active ? "text-primary" : "text-muted-foreground hover:text-foreground"),
      )}
    >
      {icon}
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}
