import { auth } from "@clerk/nextjs/server";
import { ChartNoAxesColumn, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { QuickActions } from "@/modules/quick-add/components/quick-actions";

export const metadata: Metadata = { title: "Inicio" };

export default async function DashboardPage() {
  await auth.protect();

  return (
    <div className="space-y-6">
      <PageHeader title="Inicio" description="Registra un movimiento en segundos." />
      <QuickActions />
      <Link
        href="/analysis"
        className="flex min-h-11 items-center gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-primary/12 text-primary dark:bg-primary/15">
          <ChartNoAxesColumn aria-hidden="true" className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">Presupuestos</span>
          <span className="block truncate text-[13px] text-muted-foreground">
            Cuánto llevas gastado este mes por categoría.
          </span>
        </span>
        <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
      </Link>
    </div>
  );
}
