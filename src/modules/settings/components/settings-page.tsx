import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";

import { settingsItems } from "../settings-items";

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Ajustes" description="Configura tu aplicación." />
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {settingsItems.map(({ href, title, description, icon: Icon }) => (
          <li key={href} className="min-w-0">
            <Link
              href={href}
              className="flex min-h-11 items-center gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-primary/12 text-primary dark:bg-primary/15">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{title}</span>
                <span className="block truncate text-[13px] text-muted-foreground">
                  {description}
                </span>
              </span>
              <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
