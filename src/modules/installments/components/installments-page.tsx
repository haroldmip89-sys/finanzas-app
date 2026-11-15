"use client";

import { CalendarClock, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ActionsMenu, type ResourceAction } from "@/components/shared/actions-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorMessage } from "@/components/shared/error-message";
import { PageHeader } from "@/components/shared/page-header";
import { ProgressBar } from "@/components/shared/progress-bar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/action-result";
import { formatMonth } from "@/lib/dates";
import { formatPen } from "@/lib/money";

import {
  useDeleteInstallment,
  useInstallments,
  usePayInstallment,
} from "../hooks/use-installments";
import type { InstallmentPlan } from "../types/installment.types";
import { InstallmentFormDialog } from "./installment-form-dialog";

function PlanCard({
  plan,
  onPay,
  onDelete,
}: {
  plan: InstallmentPlan;
  onPay: (plan: InstallmentPlan) => void;
  onDelete: (plan: InstallmentPlan) => void;
}) {
  const actions: ResourceAction[] = [
    ...(plan.finished ? [] : [{ label: "Pagué una cuota", onSelect: () => onPay(plan) }]),
    { label: "Eliminar", onSelect: () => onDelete(plan), destructive: true },
  ];
  const percent = Math.round((plan.paidCount / plan.installmentCount) * 100);

  return (
    <li className="min-w-0 space-y-3 rounded-2xl border border-border bg-card p-4 pr-2 text-card-foreground">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{plan.name}</p>
          <p className="truncate text-[13px] text-muted-foreground tabular-nums">
            {plan.accountName} · {formatPen(plan.installmentCents)} por cuota
          </p>
        </div>
        <ActionsMenu actions={actions} label={`Acciones del plan ${plan.name}`} />
      </div>
      <ProgressBar
        value={percent}
        tone="success"
        label={`${plan.name}: ${plan.paidCount} de ${plan.installmentCount} cuotas pagadas`}
      />
      <div className="space-y-0.5 pr-2 text-[13px] text-muted-foreground">
        <p>
          {plan.paidCount} de {plan.installmentCount} cuotas
          {plan.finished ? " · Pagado" : ` · Falta ${formatPen(plan.remainingCents)}`}
        </p>
        {plan.nextDueMonth && (
          <p className={plan.dueThisMonth ? "font-semibold text-foreground" : undefined}>
            {plan.dueThisMonth ? "Vence este mes" : `Próxima cuota en ${formatMonth(plan.nextDueMonth)}`}
          </p>
        )}
        <p>{plan.interestCents > 0 ? `Intereses: ${formatPen(plan.interestCents)}` : "Sin intereses"}</p>
      </div>
    </li>
  );
}

export function InstallmentsPage() {
  const query = useInstallments();
  const pay = usePayInstallment();
  const remove = useDeleteInstallment();
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState<InstallmentPlan | null>(null);
  const [deleteError, setDeleteError] = useState<string>();

  const payOne = async (plan: InstallmentPlan) => {
    try {
      await pay.mutateAsync(plan.id);
      toast.success(`Cuota registrada · ${plan.name}`);
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
      Nueva compra en cuotas
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cuotas"
        description="Tus compras en cuotas. Es un recordatorio: no cambia tus saldos ni tu dinero disponible."
        action={addButton}
      />

      {query.isPending ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-[84px] rounded-xl" />
          <Skeleton className="h-[110px] rounded-xl" />
        </div>
      ) : query.isError ? (
        <ErrorMessage message="No pudimos cargar tus cuotas." onRetry={() => query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Aún no registras compras en cuotas"
          description="Si compraste algo en cuotas con tu tarjeta, anótalo para saber cuánto falta pagar."
          action={addButton}
        />
      ) : (
        <>
          <section
            aria-label="Resumen de cuotas"
            className="grid gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground sm:grid-cols-2"
          >
            <div className="min-w-0">
              <p className="text-[13px] text-muted-foreground">Vence este mes</p>
              <p className="text-xl font-bold tabular-nums">{formatPen(query.data.dueThisMonthCents)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[13px] text-muted-foreground">Falta pagar en total</p>
              <p className="text-xl font-bold tabular-nums">{formatPen(query.data.remainingCents)}</p>
            </div>
          </section>
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {query.data.items.map((plan) => (
              <PlanCard key={plan.id} plan={plan} onPay={payOne} onDelete={setToDelete} />
            ))}
          </ul>
        </>
      )}

      <InstallmentFormDialog open={formOpen} onClose={() => setFormOpen(false)} />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setToDelete(null);
            setDeleteError(undefined);
          }
        }}
        title="¿Eliminar este plan?"
        description="Se quitará el recordatorio de cuotas. No afecta tus saldos ni tus gastos."
        confirmLabel="Eliminar"
        destructive
        pending={remove.isPending}
        error={deleteError}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
