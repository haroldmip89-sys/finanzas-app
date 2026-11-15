"use client";

import { Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ActionsMenu, type ResourceAction } from "@/components/shared/actions-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorMessage } from "@/components/shared/error-message";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/action-result";
import { formatDate } from "@/lib/dates";
import { formatPen } from "@/lib/money";

import {
  useAvoidedPurchases,
  useDeleteAvoidedPurchase,
  useMarkAvoided,
} from "../hooks/use-avoided-purchases";
import { REASON_LABELS } from "../schemas/avoided-purchase.schema";
import type { AvoidedPurchase } from "../types/avoided-purchase.types";
import { AvoidedFormDialog } from "./avoided-form-dialog";

function Row({
  item,
  onKeep,
  onDelete,
}: {
  item: AvoidedPurchase;
  onKeep: (item: AvoidedPurchase) => void;
  onDelete: (item: AvoidedPurchase) => void;
}) {
  const postponed = item.status === "postponed";
  const actions: ResourceAction[] = [
    ...(postponed ? [{ label: "La dejé", onSelect: () => onKeep(item) }] : []),
    {
      label: postponed ? "La compré" : "Eliminar",
      onSelect: () => onDelete(item),
      destructive: !postponed,
    },
  ];
  const details = [
    item.categoryName,
    item.reason ? REASON_LABELS[item.reason] : null,
    formatDate(item.date),
  ].filter(Boolean);

  return (
    <li className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-4 pr-2 text-card-foreground">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold tabular-nums">
          {formatPen(item.amountCents)}
          {postponed && (
            <span className="ml-2 rounded-full border border-dashed border-input px-2 py-0.5 text-xs font-medium text-muted-foreground">
              En espera
            </span>
          )}
        </p>
        <p className="truncate text-[13px] text-muted-foreground">{details.join(" · ")}</p>
        {item.note && <p className="truncate text-[13px] text-muted-foreground">{item.note}</p>}
      </div>
      <ActionsMenu actions={actions} label={`Acciones de la compra de ${formatPen(item.amountCents)}`} />
    </li>
  );
}

export function AvoidedPage() {
  const query = useAvoidedPurchases();
  const markAvoided = useMarkAvoided();
  const remove = useDeleteAvoidedPurchase();
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState<AvoidedPurchase | null>(null);
  const [deleteError, setDeleteError] = useState<string>();

  const keep = async (item: AvoidedPurchase) => {
    try {
      await markAvoided.mutateAsync(item.id);
      toast.success("Compra evitada");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await remove.mutateAsync(toDelete.id);
      setToDelete(null);
      setDeleteError(undefined);
    } catch (error) {
      setDeleteError(errorMessage(error));
    }
  };

  const addButton = (
    <Button onClick={() => setFormOpen(true)} className="w-full sm:w-auto">
      <Plus data-icon="inline-start" />
      Registrar compra evitada
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compras evitadas"
        description="Lo que decidiste no comprar. El valor es estimado, no dinero ahorrado real."
        action={addButton}
      />

      {query.isPending ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-[84px] rounded-xl" />
          <Skeleton className="h-[72px] rounded-xl" />
        </div>
      ) : query.isError ? (
        <ErrorMessage message="No pudimos cargar tus compras evitadas." onRetry={() => query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Aún no registras compras evitadas"
          description="Cuando decidas no comprar algo, anótalo y mira cuántas llevas."
          action={addButton}
        />
      ) : (
        <>
          <section
            aria-label="Resumen del mes"
            className="grid gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground sm:grid-cols-3"
          >
            <div className="min-w-0">
              <p className="text-[13px] text-muted-foreground">Este mes</p>
              <p className="text-xl font-bold tabular-nums">
                {query.data.summary.avoidedCount} · {formatPen(query.data.summary.avoidedCents)}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[13px] text-muted-foreground">Mes anterior</p>
              <p className="text-xl font-bold tabular-nums">
                {query.data.summary.previousAvoidedCount} ·{" "}
                {formatPen(query.data.summary.previousAvoidedCents)}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[13px] text-muted-foreground">Donde más evitas</p>
              <p className="truncate text-[15px] font-semibold">
                {query.data.summary.byCategory.length > 0
                  ? query.data.summary.byCategory.map((c) => c.categoryName).join(", ")
                  : "Sin categoría aún"}
              </p>
            </div>
          </section>
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {query.data.items.map((item) => (
              <Row key={item.id} item={item} onKeep={keep} onDelete={setToDelete} />
            ))}
          </ul>
        </>
      )}

      <AvoidedFormDialog open={formOpen} onClose={() => setFormOpen(false)} />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setToDelete(null);
            setDeleteError(undefined);
          }
        }}
        title={toDelete?.status === "postponed" ? "¿La compraste?" : "¿Eliminar este registro?"}
        description={
          toDelete?.status === "postponed"
            ? "Se quita de las compras en espera. Registra el gasto desde Nuevo gasto."
            : "Se quitará de tus compras evitadas."
        }
        confirmLabel={toDelete?.status === "postponed" ? "La compré" : "Eliminar"}
        destructive={toDelete?.status !== "postponed"}
        pending={remove.isPending}
        error={deleteError}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
