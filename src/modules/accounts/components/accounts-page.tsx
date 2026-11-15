"use client";

import { Plus, Wallet } from "lucide-react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorMessage } from "@/components/shared/error-message";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

import { useAccountsManager } from "../hooks/use-accounts-manager";
import { AccountCard } from "./account-card";
import { AccountFormDialog } from "./account-form-dialog";

export function AccountsPage() {
  const m = useAccountsManager();

  const createButton = (
    <Button onClick={m.openCreate} className="min-h-11 w-full sm:min-h-8 sm:w-auto">
      <Plus data-icon="inline-start" />
      Nueva cuenta
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cuentas"
        description="Dónde guardas tu dinero."
        action={createButton}
      />

      <div className="flex items-center gap-2">
        <Switch
          id="show-archived-accounts"
          checked={m.showArchived}
          onCheckedChange={m.setShowArchived}
        />
        <Label htmlFor="show-archived-accounts">Mostrar archivadas</Label>
      </div>

      {m.archiveError && <ErrorMessage message={m.archiveError} />}

      {m.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[74px] rounded-xl" />
          ))}
        </div>
      ) : m.loadError ? (
        <ErrorMessage message={m.loadError} onRetry={m.reload} />
      ) : m.accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Aún no tienes cuentas"
          description="Crea tu primera cuenta para empezar a registrar movimientos."
          action={createButton}
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {m.accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={m.openEdit}
              onToggleArchived={m.toggleArchived}
              onDelete={m.askDelete}
            />
          ))}
        </ul>
      )}

      <AccountFormDialog
        open={m.formState.mode !== "closed"}
        account={m.formState.mode === "edit" ? m.formState.account : undefined}
        onClose={m.closeForm}
      />

      <ConfirmDialog
        open={m.confirm !== null}
        onOpenChange={(open) => !open && m.cancelConfirm()}
        title="Eliminar cuenta"
        description={`Se eliminará "${m.confirm?.account.name ?? ""}". Esta acción no se puede deshacer. Si tiene transacciones, archívala en su lugar.`}
        confirmLabel="Eliminar"
        destructive
        pending={m.isDeleting}
        error={m.deleteError}
        onConfirm={m.confirmDelete}
      />
    </div>
  );
}
