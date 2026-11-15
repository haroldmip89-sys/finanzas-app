"use client";

import { Plus, Receipt } from "lucide-react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorMessage } from "@/components/shared/error-message";
import { PageHeader } from "@/components/shared/page-header";
import { PaginationNav } from "@/components/shared/pagination-nav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/dates";
import { formatPen } from "@/lib/money";

import { useTransactionsManager } from "../hooks/use-transactions-manager";
import { TransactionFilters } from "./transaction-filters";
import { TransactionFormDialog } from "./transaction-form-dialog";
import { TransactionRow } from "./transaction-row";
import { TransactionsSummary } from "./transactions-summary";

export function TransactionsPage() {
  const m = useTransactionsManager();

  const createButton = (
    <Button onClick={m.openCreate} className="min-h-11 w-full sm:min-h-8 sm:w-auto">
      <Plus data-icon="inline-start" />
      Nueva transacción
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transacciones"
        description="Tus ingresos y gastos."
        action={createButton}
      />

      <TransactionFilters
        filters={m.filters}
        onChange={m.setFilter}
        onReset={m.resetFilters}
        isFiltered={m.isFiltered}
        accountOptions={m.accountOptions}
        categoryOptions={m.categoryOptions}
      />

      <TransactionsSummary totals={m.totals} />

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
          icon={Receipt}
          title={
            m.isFiltered
              ? "No hay transacciones con estos filtros"
              : "Aún no hay transacciones en este período"
          }
          description={
            m.isFiltered
              ? "Prueba con otro rango de fechas o limpia los filtros."
              : "Registra tu primer ingreso o gasto."
          }
          action={
            m.isFiltered ? (
              <Button variant="outline" onClick={m.resetFilters} className="min-h-11 sm:min-h-8">
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
            {m.items.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
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

      <TransactionFormDialog
        open={m.formState.mode !== "closed"}
        transaction={m.formState.mode === "edit" ? m.formState.transaction : undefined}
        onClose={m.closeForm}
      />

      <ConfirmDialog
        open={m.toDelete !== null}
        onOpenChange={(open) => !open && m.cancelDelete()}
        title="Eliminar transacción"
        description={
          m.toDelete
            ? `Se eliminará ${m.toDelete.categoryName} del ${formatDate(m.toDelete.date)} por ${formatPen(m.toDelete.amountCents)}. Esta acción no se puede deshacer.`
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
