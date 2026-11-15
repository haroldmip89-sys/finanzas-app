"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { ActionsMenu, type ResourceAction } from "./actions-menu";

export type { ResourceAction };

type ResourceCardProps = {
  icon: LucideIcon;
  title: string;
  subtitle?: ReactNode;
  /** Prominent value shown on the right, e.g. a balance. */
  value?: ReactNode;
  badge?: ReactNode;
  archived?: boolean;
  actions: ResourceAction[];
  menuLabel: string;
};

export function ResourceCard({
  icon: Icon,
  title,
  subtitle,
  value,
  badge,
  archived,
  actions,
  menuLabel,
}: ResourceCardProps) {
  return (
    <li
      className={cn(
        // min-w-0: as a grid item the card must be allowed to shrink below its text,
        // otherwise `truncate` never applies and the page overflows on mobile.
        "flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card p-4 text-card-foreground",
        archived && "opacity-60",
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{title}</p>
        {subtitle && (
          <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {value && <p className="shrink-0 font-semibold tabular-nums">{value}</p>}
      {badge}
      <ActionsMenu actions={actions} label={menuLabel} />
    </li>
  );
}
