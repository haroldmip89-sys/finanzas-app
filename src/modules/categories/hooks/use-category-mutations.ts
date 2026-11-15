"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { unwrapResult } from "@/lib/action-result";

import {
  createCategoryAction,
  deleteCategoryAction,
  setCategoryArchivedAction,
  updateCategoryAction,
} from "../actions/categories.actions";
import type {
  CategoryCreateInput,
  CategoryUpdateInput,
} from "../schemas/category.schema";
import { categoriesKey } from "./use-categories";

function useInvalidateCategories() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: categoriesKey });
}

type SaveVariables =
  | { id?: undefined; input: CategoryCreateInput }
  | { id: string; input: CategoryUpdateInput };

export function useSaveCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: async (variables: SaveVariables) =>
      unwrapResult(
        variables.id
          ? await updateCategoryAction(variables.id, variables.input)
          : await createCategoryAction(variables.input),
      ),
    onSuccess: invalidate,
  });
}

export function useSetCategoryArchived() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) =>
      unwrapResult(await setCategoryArchivedAction(id, archived)),
    onSuccess: invalidate,
  });
}

export function useDeleteCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: async (id: string) => unwrapResult(await deleteCategoryAction(id)),
    onSuccess: invalidate,
  });
}
