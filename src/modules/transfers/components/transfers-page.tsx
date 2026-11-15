"use client";

import { ArrowLeftRight, Plus } from "lucide-react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorMessage } from "@/components/shared/error-message";
import { PageHeader } from "@/components/shared/page-header";
import { PaginationNav } from "@/components/shared/pagination-nav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/dates";
import { formatPen } from "@/lib/money";

import { useTransfersManager } from "../hooks/use-transfers-manager";
import { TransferFilters } from "./transfer-filters";
import { TransferFormDialog } from "./transfer-form-dialog";
import { TransferRow } from "./transfer-row";

export function TransfersPage() {
  const m = useTransfersManager();

  const createButton = (
    <Button onClick={m.openCreate} className="w-full sm:w-auto">
      <Plus data-icon="inline-start" />
      Nueva transferencia
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transferencias"
        description="Dinero que mueves entre tus propias cuentas."
        action={createButton}
      />

      <TransferFilters
        filters={m.filters}
        onChange={m.setFilter}
        onReset={m.resetFilters}
        isFiltered={m.isFiltered}
        accountOptions={m.accountOptions}
      />

      {m.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[74px] rounded-xl" />
          ))}
        </div>
      ) : m.loadError ? (
        <ErrorMessage message={m.loadError} onRetry={m.reload} />
      ) : m.items.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title={
            m.isFiltered
              ? "No hay transferencias con estos filtros"
              : "Aún no hay transferencias en este período"
          }
          description={
            m.isFiltered
              ? "Prueba con otro rango de fechas o limpia los filtros."
              : "Mueve dinero entre tus cuentas, por ejemplo de BBVA a Yape."
          }
          action={
            m.isFiltered ? (
              <Button variant="outline" onClick={m.resetFilters}>
                Limpiar filtros
              </Button>
            ) : (
              createButton
            )
          }
        />
      ) : (
        <div className="space-y-4">
          <ul className="space-y-3" aria-busy={m.isFetching}>
            {m.items.map((transfer) => (
              <TransferRow
                key={transfer.id}
                transfer={transfer}
                onEdit={m.openEdit}
                onDelete={m.askDelete}
              />
            ))}
          </ul>
          <PaginationNav
            page={m.page}
            totalPages={m.totalPages}
            onPageChange={m.setPage}
            disabled={m.isFetching}
          />
        </div>
      )}

      <TransferFormDialog
        open={m.formState.mode !== "closed"}
        transfer={m.formState.mode === "edit" ? m.formState.transfer : undefined}
        onClose={m.closeForm}
      />

      <ConfirmDialog
        open={m.toDelete !== null}
        onOpenChange={(open) => !open && m.cancelDelete()}
        title="Eliminar transferencia"
        description={
          m.toDelete
            ? `Se eliminará la transferencia de ${m.toDelete.fromAccountName} a ${m.toDelete.toAccountName} del ${formatDate(m.toDelete.date)} por ${formatPen(m.toDelete.amountCents)}. Los saldos de ambas cuentas se ajustarán. Esta acción no se puede deshacer.`
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
