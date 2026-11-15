import { and, asc, eq, sql } from "drizzle-orm";

import { db as defaultDb } from "@/db/client";
import { categories } from "@/db/schema";
import type { Database } from "@/db/types";
import {
  AppError,
  PG_UNIQUE_VIOLATION,
  isInUseError,
  pgErrorCode,
} from "@/lib/errors";

import { DEFAULT_CATEGORIES } from "../constants/default-categories";
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  type CategoryCreateInput,
  type CategoryUpdateInput,
} from "../schemas/category.schema";
import type { Category } from "../types/category.types";

const DUPLICATE_MESSAGE = "Ya tienes una categoría con ese nombre.";

export function createCategoriesService(db: Database) {
  const owned = (userId: string, id: string) =>
    and(eq(categories.userId, userId), eq(categories.id, id));

  /**
   * Seeds the default categories only when the user has none at all
   * (archived ones count). Idempotent and safe under concurrency: the unique
   * (user, kind, name) constraint plus ON CONFLICT DO NOTHING avoid duplicates.
   */
  async function ensureDefaults(userId: string): Promise<boolean> {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(categories)
      .where(eq(categories.userId, userId));
    if (count > 0) return false;

    await db
      .insert(categories)
      .values(DEFAULT_CATEGORIES.map((c) => ({ userId, ...c })))
      .onConflictDoNothing();
    return true;
  }

  async function list(
    userId: string,
    options: { includeArchived?: boolean } = {},
  ): Promise<Category[]> {
    await ensureDefaults(userId);

    return db
      .select()
      .from(categories)
      .where(
        options.includeArchived
          ? eq(categories.userId, userId)
          : and(eq(categories.userId, userId), sql`${categories.archivedAt} IS NULL`),
      )
      .orderBy(
        sql`(${categories.archivedAt} IS NOT NULL)`,
        asc(categories.kind),
        asc(categories.name),
      );
  }

  async function assertNameFree(
    userId: string,
    kind: Category["kind"],
    name: string,
    exceptId?: string,
  ) {
    const rows = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.userId, userId),
          eq(categories.kind, kind),
          sql`lower(${categories.name}) = lower(${name})`,
        ),
      );
    if (rows.some((r) => r.id !== exceptId)) {
      throw new AppError("CONFLICT", DUPLICATE_MESSAGE, { name: DUPLICATE_MESSAGE });
    }
  }

  function mapWriteError(error: unknown): never {
    if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) {
      throw new AppError("CONFLICT", DUPLICATE_MESSAGE, { name: DUPLICATE_MESSAGE });
    }
    throw error;
  }

  async function create(userId: string, input: CategoryCreateInput): Promise<Category> {
    const data = categoryCreateSchema.parse(input);
    await assertNameFree(userId, data.kind, data.name);

    try {
      const [row] = await db
        .insert(categories)
        .values({ userId, ...data })
        .returning();
      return row;
    } catch (error) {
      return mapWriteError(error);
    }
  }

  async function getOwned(userId: string, id: string): Promise<Category> {
    const [row] = await db.select().from(categories).where(owned(userId, id));
    if (!row) throw new AppError("NOT_FOUND", "La categoría no existe.");
    return row;
  }

  async function update(
    userId: string,
    id: string,
    input: CategoryUpdateInput,
  ): Promise<Category> {
    const data = categoryUpdateSchema.parse(input);
    const current = await getOwned(userId, id);
    await assertNameFree(userId, current.kind, data.name, id);

    try {
      const [row] = await db
        .update(categories)
        .set(data)
        .where(owned(userId, id))
        .returning();
      return row;
    } catch (error) {
      return mapWriteError(error);
    }
  }

  async function setArchived(
    userId: string,
    id: string,
    archived: boolean,
  ): Promise<Category> {
    const [row] = await db
      .update(categories)
      .set({ archivedAt: archived ? new Date() : null })
      .where(owned(userId, id))
      .returning();
    if (!row) throw new AppError("NOT_FOUND", "La categoría no existe.");
    return row;
  }

  async function remove(userId: string, id: string): Promise<void> {
    try {
      const rows = await db
        .delete(categories)
        .where(owned(userId, id))
        .returning({ id: categories.id });
      if (rows.length === 0) {
        throw new AppError("NOT_FOUND", "La categoría no existe.");
      }
    } catch (error) {
      if (isInUseError(error)) {
        throw new AppError(
          "IN_USE",
          "No se puede eliminar: tiene transacciones o presupuestos. Archívala en su lugar.",
        );
      }
      throw error;
    }
  }

  return {
    ensureDefaults,
    list,
    create,
    update,
    archive: (userId: string, id: string) => setArchived(userId, id, true),
    unarchive: (userId: string, id: string) => setArchived(userId, id, false),
    remove,
  };
}

export const categoriesService = createCategoriesService(defaultDb);
