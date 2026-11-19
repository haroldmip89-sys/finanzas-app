"use client";

import { Plus, ShieldCheck } from "lucide-react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorMessage } from "@/components/shared/error-message";
import { PageHeader } from "@/components/shared/page-header";
import { SummaryTile } from "@/components/shared/summary-tile";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMonth } from "@/lib/dates";
import { formatPen } from "@/lib/money";
import { MonthSwitcher } from "@/modules/budgets/components/month-switcher";

import { useAvoidedManager } from "../hooks/use-avoided-manager";
import { AvoidedFormDialog } from "./avoided-form-dialog";
import { AvoidedRow } from "./avoided-row";

function countLabel(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function AvoidedPage() {
  const m = useAvoidedManager();

  const createButton = (
    <Button onClick={m.openCreate} className="w-full sm:w-auto">
      <Plus data-icon="inline-start" />
      Registrar compra evitada
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compras evitadas"
        description="Lo que decidiste no gastar. Es lo que habrías gastado, no dinero ahorrado."
        action={createButton}
      />

      <MonthSwitcher
        month={m.month}
        isCurrentMonth={m.isCurrentMonth}
        onPrevious={m.previousMonth}
        onNext={m.nextMonth}
        onThisMonth={m.goToThisMonth}
      />

      {m.statusError && <ErrorMessage message={m.statusError} />}

      {m.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-[84px] rounded-2xl" />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[74px] rounded-2xl" />
          ))}
        </div>
      ) : m.loadError ? (
        <ErrorMessage message={m.loadError} onRetry={m.reload} />
      ) : m.items.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={`Aún no registras compras evitadas en ${formatMonth(m.month)}`}
          description="Cuando decidas no comprar algo, anótalo aquí para ver cuánto llevas."
          action={createButton}
        />
      ) : (
        <div className="space-y-6" aria-busy={m.isFetching}>
          <section aria-label="Resumen del mes" className="grid gap-3 sm:grid-cols-2">
            <SummaryTile
              label={countLabel(m.totals.avoidedCount, "compra evitada", "compras evitadas")}
              value={formatPen(m.totals.avoidedCents)}
              note={`Mes anterior a la misma altura: ${countLabel(m.previous.count, "compra", "compras")} · ${formatPen(m.previous.cents)}`}
            />
            <SummaryTile
              label={countLabel(m.totals.postponedCount, "compra pospuesta", "compras pospuestas")}
              value={formatPen(m.totals.postponedCents)}
              note="Aún pueden terminar en compra: no suman arriba."
            />
          </section>

          {m.byCategory.length > 0 && (
            <section aria-label="Dónde más evitas" className="space-y-3">
              <h2 className="text-[17px] font-semibold">Dónde más evitas</h2>
              <ul className="divide-y divide-border rounded-2xl border border-border bg-card px-4">
                {m.byCategory.map((c) => (
                  <li key={c.categoryId ?? "none"} className="flex min-h-12 items-center gap-3 text-sm">
                    <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                    <span className="text-muted-foreground">{countLabel(c.count, "compra", "compras")}</span>
                    <span className="font-semibold">{formatPen(c.cents)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-label="Historial" className="space-y-3">
            <h2 className="text-[17px] font-semibold">Historial</h2>
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {m.items.map((item) => (
                <AvoidedRow
                  key={item.id}
                  item={item}
                  onEdit={m.openEdit}
                  onMarkAvoided={m.markAvoided}
                  onDelete={m.askDelete}
                />
              ))}
            </ul>
          </section>
        </div>
      )}

      <AvoidedFormDialog
        open={m.formState.mode !== "closed"}
        item={m.formState.mode === "edit" ? m.formState.item : undefined}
        onClose={m.closeForm}
      />

      <ConfirmDialog
        open={m.toDelete !== null}
        onOpenChange={(open) => !open && m.cancelDelete()}
        title="Eliminar compra evitada"
        description={
          m.toDelete
            ? `Se eliminará este registro (${formatPen(m.toDelete.amountCents)}). Tus saldos y gastos no cambian.`
            : ""
        }
        confirmLabel="Eliminar"
        destructive
        pending={m.isDeleting}
        error={m.deleteError}
        onConfirm={m.confirmDelete}
      />
    </div>
  );
}
