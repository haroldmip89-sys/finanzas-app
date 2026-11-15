import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

import { db as defaultDb } from "@/db/client";
import { avoidedPurchases, categories } from "@/db/schema";
import type { Database } from "@/db/types";
import { addMonths, currentMonthKey, monthKeyRange } from "@/lib/dates";
import { AppError } from "@/lib/errors";

import { avoidedCreateSchema, type AvoidedCreateInput } from "../schemas/avoided-purchase.schema";
import type {
  AvoidedCategoryTotal,
  AvoidedOverview,
  AvoidedPurchase,
  AvoidedSummary,
} from "../types/avoided-purchase.types";

const NOT_FOUND_MESSAGE = "La compra no existe.";
const LIST_LIMIT = 100;

export function createAvoidedPurchasesService(db: Database) {
  const owned = (userId: string, id: string) =>
    and(eq(avoidedPurchases.userId, userId), eq(avoidedPurchases.id, id));

  async function assertCategory(userId: string, categoryId: string) {
    const [category] = await db
      .select({
        kind: categories.kind,
        archivedAt: categories.archivedAt,
        systemKey: categories.systemKey,
      })
      .from(categories)
      .where(and(eq(categories.userId, userId), eq(categories.id, categoryId)));

    let message: string | undefined;
    if (!category || category.systemKey) message = "La categoría no existe.";
    else if (category.kind !== "expense") message = "Elige una categoría de gasto.";
    else if (category.archivedAt) message = "La categoría está archivada.";

    if (message) {
      throw new AppError("VALIDATION", "Revisa los datos ingresados.", { categoryId: message });
    }
  }

  /** Sums of `avoided` purchases between two days (both included). */
  async function avoidedBetween(userId: string, from: string, to: string) {
    const [row] = await db
      .select({
        count: sql<number>`count(*)::int`,
        cents: sql<number>`coalesce(sum(${avoidedPurchases.amountCents}), 0)::float8`,
      })
      .from(avoidedPurchases)
      .where(
        and(
          eq(avoidedPurchases.userId, userId),
          eq(avoidedPurchases.status, "avoided"),
          gte(avoidedPurchases.date, from),
          lte(avoidedPurchases.date, to),
        ),
      );
    return row;
  }

  async function summary(userId: string, now: Date = new Date()): Promise<AvoidedSummary> {
    const month = currentMonthKey(now);
    const { from, to } = monthKeyRange(month);
    const previous = monthKeyRange(addMonths(month, -1));

    const [current, before] = await Promise.all([
      avoidedBetween(userId, from, to),
      avoidedBetween(userId, previous.from, previous.to),
    ]);

    // Postponed purchases are still open: they count regardless of their day.
    const [postponed] = await db
      .select({
        count: sql<number>`count(*)::int`,
        cents: sql<number>`coalesce(sum(${avoidedPurchases.amountCents}), 0)::float8`,
      })
      .from(avoidedPurchases)
      .where(and(eq(avoidedPurchases.userId, userId), eq(avoidedPurchases.status, "postponed")));

    const total = sql<number>`sum(${avoidedPurchases.amountCents})::float8`;
    const byCategory: AvoidedCategoryTotal[] = await db
      .select({
        categoryId: categories.id,
        categoryName: categories.name,
        cents: total,
        count: sql<number>`count(*)::int`,
      })
      .from(avoidedPurchases)
      .innerJoin(categories, eq(categories.id, avoidedPurchases.categoryId))
      .where(
        and(
          eq(avoidedPurchases.userId, userId),
          eq(avoidedPurchases.status, "avoided"),
          gte(avoidedPurchases.date, from),
          lte(avoidedPurchases.date, to),
        ),
      )
      .groupBy(categories.id)
      .orderBy(desc(total))
      .limit(3);

    return {
      avoidedCount: current.count,
      avoidedCents: current.cents,
      previousAvoidedCount: before.count,
      previousAvoidedCents: before.cents,
      postponedCount: postponed.count,
      postponedCents: postponed.cents,
      byCategory,
    };
  }

  /** Latest records (postponed first) and the figures of the month. */
  async function overview(userId: string, now: Date = new Date()): Promise<AvoidedOverview> {
    const rows = await db
      .select({
        id: avoidedPurchases.id,
        categoryId: avoidedPurchases.categoryId,
        categoryName: categories.name,
        amountCents: avoidedPurchases.amountCents,
        date: avoidedPurchases.date,
        status: avoidedPurchases.status,
        reason: avoidedPurchases.reason,
        note: avoidedPurchases.note,
        revisitAt: avoidedPurchases.revisitAt,
      })
      .from(avoidedPurchases)
      .leftJoin(categories, eq(categories.id, avoidedPurchases.categoryId))
      .where(eq(avoidedPurchases.userId, userId))
      .orderBy(
        sql`(${avoidedPurchases.status} = 'postponed') desc`,
        desc(avoidedPurchases.date),
        desc(avoidedPurchases.createdAt),
      )
      .limit(LIST_LIMIT);

    const items: AvoidedPurchase[] = rows.map((r) => ({
      ...r,
      revisitAt: r.revisitAt ? r.revisitAt.toISOString() : null,
    }));
    return { items, summary: await summary(userId, now) };
  }

  async function create(userId: string, input: AvoidedCreateInput): Promise<{ id: string }> {
    const data = avoidedCreateSchema.parse(input);
    if (data.categoryId) await assertCategory(userId, data.categoryId);

    const postponed = data.status === "postponed";
    const [row] = await db
      .insert(avoidedPurchases)
      .values({
        userId,
        amountCents: data.amountCents,
        date: data.date,
        categoryId: data.categoryId ?? null,
        reason: data.reason ?? null,
        note: data.note,
        status: data.status,
        revisitAt: postponed && data.revisitAt ? new Date(data.revisitAt) : null,
      })
      .returning({ id: avoidedPurchases.id });
    return row;
  }

  /** "La dejé": a postponed purchase becomes an avoided one. */
  async function markAvoided(userId: string, id: string): Promise<void> {
    const rows = await db
      .update(avoidedPurchases)
      .set({ status: "avoided", revisitAt: null })
      .where(owned(userId, id))
      .returning({ id: avoidedPurchases.id });
    if (rows.length === 0) throw new AppError("NOT_FOUND", NOT_FOUND_MESSAGE);
  }

  async function remove(userId: string, id: string): Promise<void> {
    const rows = await db
      .delete(avoidedPurchases)
      .where(owned(userId, id))
      .returning({ id: avoidedPurchases.id });
    if (rows.length === 0) throw new AppError("NOT_FOUND", NOT_FOUND_MESSAGE);
  }

  return { overview, summary, create, markAvoided, remove };
}

export const avoidedPurchasesService = createAvoidedPurchasesService(defaultDb);
