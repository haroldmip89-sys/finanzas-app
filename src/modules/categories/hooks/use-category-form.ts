"use client";

import { ActionFailure, errorMessage } from "@/lib/action-result";
import { useZodForm } from "@/hooks/use-zod-form";

import { DEFAULT_CATEGORY_ICON } from "../constants/category-icon-keys";
import {
  categoryCreateSchema,
  type CategoryCreateInput,
} from "../schemas/category.schema";
import type { Category, CategoryKind } from "../types/category.types";
import { useSaveCategory } from "./use-category-mutations";

function defaultsFor(
  category: Category | undefined,
  defaultKind: CategoryKind,
): CategoryCreateInput {
  return {
    name: category?.name ?? "",
    kind: category?.kind ?? defaultKind,
    icon: (category?.icon as CategoryCreateInput["icon"] | null) ?? DEFAULT_CATEGORY_ICON,
  };
}

type Options = {
  category?: Category;
  defaultKind: CategoryKind;
  onSuccess: () => void;
};

export function useCategoryForm({ category, defaultKind, onSuccess }: Options) {
  const save = useSaveCategory();
  const { form, applyServerError, submitError } = useZodForm(
    categoryCreateSchema,
    defaultsFor(category, defaultKind),
  );

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (category) {
        // The kind is immutable: only name and icon are sent when editing.
        await save.mutateAsync({
          id: category.id,
          input: { name: values.name, icon: values.icon },
        });
      } else {
        await save.mutateAsync({ input: values });
      }
      onSuccess();
    } catch (error) {
      applyServerError({
        message: errorMessage(error),
        fieldErrors: error instanceof ActionFailure ? error.fieldErrors : undefined,
      });
    }
  });

  return {
    form,
    onSubmit,
    submitError,
    isPending: save.isPending,
    isEditing: Boolean(category),
  };
}
