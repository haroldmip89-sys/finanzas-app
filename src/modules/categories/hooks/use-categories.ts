"use client";

import { useQuery } from "@tanstack/react-query";

import { unwrapResult } from "@/lib/action-result";

import { listCategoriesAction } from "../actions/categories.actions";

export const categoriesKey = ["categories"] as const;

export function useCategories(includeArchived: boolean) {
  return useQuery({
    queryKey: [...categoriesKey, { includeArchived }],
    queryFn: async () =>
      unwrapResult(await listCategoriesAction({ includeArchived })),
  });
}
