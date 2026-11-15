"use server";

import { requireUserId } from "@/lib/auth";
import { runAction } from "@/lib/run-action";
import type { ActionResult } from "@/lib/action-result";

import {
  categoryCreateSchema,
  categoryIdSchema,
  categoryUpdateSchema,
  listCategoriesSchema,
} from "../schemas/category.schema";
import { categoriesService } from "../services/categories.service";
import type { Category } from "../types/category.types";

export async function listCategoriesAction(
  input?: unknown,
): Promise<ActionResult<Category[]>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const { includeArchived } = listCategoriesSchema.parse(input ?? {});
    return categoriesService.list(userId, { includeArchived });
  });
}

export async function createCategoryAction(
  input: unknown,
): Promise<ActionResult<Category>> {
  return runAction(async () => {
    const userId = await requireUserId();
    return categoriesService.create(userId, categoryCreateSchema.parse(input));
  });
}

export async function updateCategoryAction(
  id: unknown,
  input: unknown,
): Promise<ActionResult<Category>> {
  return runAction(async () => {
    const userId = await requireUserId();
    return categoriesService.update(
      userId,
      categoryIdSchema.parse(id),
      categoryUpdateSchema.parse(input),
    );
  });
}

export async function setCategoryArchivedAction(
  id: unknown,
  archived: unknown,
): Promise<ActionResult<Category>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const categoryId = categoryIdSchema.parse(id);
    return archived === true
      ? categoriesService.archive(userId, categoryId)
      : categoriesService.unarchive(userId, categoryId);
  });
}

export async function deleteCategoryAction(
  id: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const userId = await requireUserId();
    await categoriesService.remove(userId, categoryIdSchema.parse(id));
    return null;
  });
}
