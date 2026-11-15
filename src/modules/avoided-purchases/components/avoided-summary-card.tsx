"use client";

import Link from "next/link";
import { useState } from "react";

import { ErrorMessage } from "@/components/shared/error-message";
import { Button } from "@/components/ui/button";
import { formatPen } from "@/lib/money";
import {
  DashboardSection,
  SectionSkeleton,
} from "@/modules/dashboard/components/dashboard-section";

import { useAvoidedPurchases } from "../hooks/use-avoided-purchases";
import { AvoidedFormDialog } from "./avoided-form-dialog";

/** Inicio card: purchases avoided this month. The amount is not saved money. */
export function AvoidedSummaryCard() {
  const query = useAvoidedPurchases();
  const [formOpen, setFormOpen] = useState(false);

  if (query.isPending) return <SectionSkeleton title="Compras evitadas" />;
  if (query.isError) {
    return (
      <ErrorMessage
        message="No pudimos cargar tus compras evitadas."
        onRetry={() => query.refetch()}
      />
    );
  }

  const { summary } = query.data;

  return (
    <DashboardSection
      title="Compras evitadas"
      aside={
        <Link href="/avoided" className="text-sm font-semibold text-primary">
          Ver todas
        </Link>
      }
    >
      {summary.avoidedCount === 0 && summary.postponedCount === 0 ? (
        <p className="text-sm text-muted-foreground">
          Cuando decidas no comprar algo, anótalo aquí y mira cuántas llevas este mes.
        </p>
      ) : (
        <div className="space-y-1">
          <p className="text-[26px] leading-8 font-bold">
            {summary.avoidedCount} {summary.avoidedCount === 1 ? "compra" : "compras"}
          </p>
          <p className="text-[13px] text-muted-foreground">
            Valor estimado {formatPen(summary.avoidedCents)} este mes. No es dinero ahorrado real.
          </p>
          {summary.postponedCount > 0 && (
            <p className="text-[13px] text-muted-foreground">
              {summary.postponedCount} en espera · {formatPen(summary.postponedCents)}
            </p>
          )}
        </div>
      )}
      <Button variant="outline" onClick={() => setFormOpen(true)} className="w-full sm:w-auto">
        Registrar compra evitada
      </Button>
      <AvoidedFormDialog open={formOpen} onClose={() => setFormOpen(false)} />
    </DashboardSection>
  );
}
