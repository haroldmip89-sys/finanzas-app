"use client";

import { Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { isItemActive, settingsItem } from "../nav-items";

/** Gear icon that opens Ajustes, for the mobile top bar. */
export function SettingsLink() {
  const pathname = usePathname();
  const active = isItemActive(pathname, settingsItem);

  return (
    <Link
      href={settingsItem.href}
      aria-label={settingsItem.label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex size-11 items-center justify-center rounded-lg outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <Settings aria-hidden="true" className="size-5" />
    </Link>
  );
}
