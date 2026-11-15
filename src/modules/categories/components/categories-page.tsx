"use client";

import { Plus, Tags } from "lucide-react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorMessage } from "@/components/shared/error-message";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useCategoriesManager } from "../hooks/use-categories-manager";
import type { CategoryKind } from "../types/category.types";
import { CategoryCard } from "./category-card";
import { CategoryFormDialog } from "./category-form-dialog";

export function CategoriesPage() {
  const m = useCategoriesManager();

  const createButton = (
    <Button onClick={m.openCreate} className="w-full sm:w-auto">
      <Plus data-icon="inline-start" />
      Nueva categoría
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorías"
        description="Clasifica tus ingresos y gastos."
        action={createButton}
      />

      <Tabs value={m.kind} onValueChange={(v) => m.setKind(v as CategoryKind)}>
        <TabsList className="h-11 w-full sm:h-8 sm:w-fit">
          <TabsTrigger value="expense" className="min-h-9 flex-1 sm:flex-none">
            Gastos
          </TabsTrigger>
          <TabsTrigger value="income" className="min-h-9 flex-1 sm:flex-none">
            Ingresos
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex items-center gap-2">
        <Switch
          id="show-archived-categories"
          checked={m.showArchived}
          onCheckedChange={m.setShowArchived}
        />
        <Label htmlFor="show-archived-categories">Mostrar archivadas</Label>
      </div>

      {m.archiveError && <ErrorMessage message={m.archiveError} />}

      {m.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-[74px] rounded-xl" />
          ))}
        </div>
      ) : m.loadError ? (
        <ErrorMessage message={m.loadError} onRetry={m.reload} />
      ) : m.categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title={
            m.kind === "expense"
              ? "No tienes categorías de gasto"
              : "No tienes categorías de ingreso"
          }
          description="Crea una para empezar a clasificar tus movimientos."
          action={createButton}
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {m.categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onEdit={m.openEdit}
              onToggleArchived={m.toggleArchived}
              onDelete={m.askDelete}
            />
          ))}
        </ul>
      )}

      <CategoryFormDialog
        open={m.formState.mode !== "closed"}
        category={m.formState.mode === "edit" ? m.formState.category : undefined}
        defaultKind={m.kind}
        onClose={m.closeForm}
      />

      <ConfirmDialog
        open={m.toDelete !== null}
        onOpenChange={(open) => !open && m.cancelDelete()}
        title="Eliminar categoría"
        description={`Se eliminará "${m.toDelete?.name ?? ""}". Esta acción no se puede deshacer. Si tiene transacciones, archívala en su lugar.`}
        confirmLabel="Eliminar"
        destructive
        pending={m.isDeleting}
        error={m.deleteError}
        onConfirm={m.confirmDelete}
      />
    </div>
  );
}
