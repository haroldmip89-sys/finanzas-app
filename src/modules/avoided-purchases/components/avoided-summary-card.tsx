"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ErrorMessage } from "@/components/shared/error-message";
import { Button } from "@/components/ui/button";
import { currentMonthKey } from "@/lib/dates";
import { formatPen } from "@/lib/money";
import { DashboardSection, SectionSkeleton } from "@/modules/dashboard/components/dashboard-section";
import { previousMonthName } from "@/modules/dashboard/month-labels";

import { useAvoided } from "../hooks/use-avoided";
import { AvoidedFormDialog } from "./avoided-form-dialog";

const TITLE = "Compras evitadas";

/** Inicio: how much you decided not to spend this month, with a quick way to add one. */
export function AvoidedSummaryCard() {
  const query = useAvoided(currentMonthKey());
  const [open, setOpen] = useState(false);

  if (query.isPending) return <SectionSkeleton title={TITLE} />;
  if (query.isError) {
    return (
      <ErrorMessage
        message="No pudimos cargar tus compras evitadas. Tus datos están a salvo."
        onRetry={() => query.refetch()}
      />
    );
  }

  const { totals, previous } = query.data;
  const empty = totals.avoidedCount === 0 && totals.postponedCount === 0;
  const month = previousMonthName();

  return (
    <DashboardSection
      title={TITLE}
      aside={
        <Link href="/avoided" className="text-sm font-semibold text-primary">
          Ver todas
        </Link>
      }
    >
      {empty ? (
        <p className="text-sm text-muted-foreground">
          Aún no registras compras evitadas este mes. Cuando decidas no comprar algo, anótalo aquí.
        </p>
      ) : (
        <div className="flex items-start gap-3.5 rounded-2xl bg-success/12 p-4 dark:bg-success/15">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-card text-success">
            <ShieldCheck aria-hidden="true" className="size-[22px]" />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-[15px] font-bold">
              {totals.avoidedCount} {totals.avoidedCount === 1 ? "compra evitada" : "compras evitadas"} este mes
            </p>
            <p className="text-[13px]">
              {formatPen(totals.avoidedCents)} que decidiste no gastar
            </p>
            <p className="text-[13px] text-muted-foreground">
              {previous.count === 0
                ? `A esta altura de ${month}: ninguna.`
                : `A esta altura de ${month}: ${previous.count} · ${formatPen(previous.cents)}.`}
              {totals.postponedCount > 0 &&
                ` ${totals.postponedCount} ${totals.postponedCount === 1 ? "pospuesta" : "pospuestas"}.`}
            </p>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">Es lo que habrías gastado, no dinero ahorrado.</p>

      <Button variant="outline" className="w-full sm:w-auto" onClick={() => setOpen(true)}>
        Registrar compra evitada
      </Button>

      <AvoidedFormDialog open={open} onClose={() => setOpen(false)} />
    </DashboardSection>
  );
}
