"use client";

import { useState } from "react";

import { errorMessage } from "@/lib/action-result";

import type { Category, CategoryKind } from "../types/category.types";
import {
  useDeleteCategory,
  useSetCategoryArchived,
} from "./use-category-mutations";
import { useCategories } from "./use-categories";

type FormState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; category: Category };

/** All UI state and handlers of the categories page. */
export function useCategoriesManager() {
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [showArchived, setShowArchived] = useState(false);
  const [formState, setFormState] = useState<FormState>({ mode: "closed" });
  const [toDelete, setToDelete] = useState<Category | null>(null);

  const query = useCategories(showArchived);
  const archive = useSetCategoryArchived();
  const remove = useDeleteCategory();

  const categories = (query.data ?? []).filter((c) => c.kind === kind);

  return {
    kind,
    setKind,
    categories,
    isLoading: query.isPending,
    loadError: query.isError ? errorMessage(query.error) : undefined,
    reload: () => query.refetch(),

    showArchived,
    setShowArchived,

    formState,
    openCreate: () => setFormState({ mode: "create" }),
    openEdit: (category: Category) => setFormState({ mode: "edit", category }),
    closeForm: () => setFormState({ mode: "closed" }),

    toggleArchived: (category: Category) =>
      archive.mutate({ id: category.id, archived: category.archivedAt === null }),
    archiveError: archive.isError ? errorMessage(archive.error) : undefined,

    toDelete,
    askDelete: (category: Category) => {
      remove.reset();
      setToDelete(category);
    },
    cancelDelete: () => setToDelete(null),
    confirmDelete: () => {
      if (!toDelete) return;
      remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) });
    },
    isDeleting: remove.isPending,
    deleteError: remove.isError ? errorMessage(remove.error) : undefined,
  };
}
