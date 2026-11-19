import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

import { db as defaultDb } from "@/db/client";
import { avoidedPurchases, categories } from "@/db/schema";
import type { Database } from "@/db/types";
import { monthKeyRange, todayInLima } from "@/lib/dates";
import { AppError } from "@/lib/errors";

import { comparisonRanges, groupByCategory, summarize } from "../avoided-math";
import {
  avoidedInputSchema,
  avoidedMonthSchema,
  avoidedStatusSchema,
  type AvoidedInput,
} from "../schemas/avoided.schema";
import type {
  AvoidedItem,
  AvoidedOverview,
  AvoidedPurchase,
  AvoidedStatus,
} from "../types/avoided.types";

const NOT_FOUND_MESSAGE = "La compra evitada no existe.";

function validationError(field: string, message: string): AppError {
  return new AppError("VALIDATION", "Revisa los datos ingresados.", { [field]: message });
}

/**
 * Purchases the user decided not to make. They are NOT financial movements:
 * this service never touches transactions, balances, budgets or available money.
 */
export function createAvoidedPurchasesService(db: Database) {
  const owned = (userId: string, id: string) =>
    and(eq(avoidedPurchases.userId, userId), eq(avoidedPurchases.id, id));

  /**
   * An optional category must be the user's own expense category and not a
   * system one. An archived one is accepted only if the record already uses it.
   */
  async function assertCategory(userId: string, categoryId: string | null, keepId?: string | null) {
    if (categoryId === null) return;
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
    else if (category.archivedAt && categoryId !== keepId) message = "La categoría está archivada.";

    if (message) throw validationError("categoryId", message);
  }

  function assertNotFuture(date: string, now: Date) {
    if (date > todayInLima(now)) throw validationError("date", "La fecha no puede ser futura.");
  }

  async function list(
    userId: string,
    monthInput: string,
    now: Date = new Date(),
  ): Promise<AvoidedOverview> {
    const month = avoidedMonthSchema.parse(monthInput);
    const { from, to } = monthKeyRange(month);

    const items: AvoidedItem[] = await db
      .select({
        id: avoidedPurchases.id,
        amountCents: avoidedPurchases.amountCents,
        date: avoidedPurchases.date,
        categoryId: avoidedPurchases.categoryId,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        reason: avoidedPurchases.reason,
        note: avoidedPurchases.note,
        status: avoidedPurchases.status,
      })
      .from(avoidedPurchases)
      .leftJoin(categories, eq(categories.id, avoidedPurchases.categoryId))
      .where(
        and(
          eq(avoidedPurchases.userId, userId),
          gte(avoidedPurchases.date, from),
          lte(avoidedPurchases.date, to),
        ),
      )
      .orderBy(desc(avoidedPurchases.date), desc(avoidedPurchases.createdAt));

    const { previous } = comparisonRanges(month, now);
    const [before] = await db
      .select({
        count: sql<number>`count(*)::int`,
        cents: sql<number>`coalesce(sum(${avoidedPurchases.amountCents}), 0)::float8`,
      })
      .from(avoidedPurchases)
      .where(
        and(
          eq(avoidedPurchases.userId, userId),
          eq(avoidedPurchases.status, "avoided"),
          gte(avoidedPurchases.date, previous.from),
          lte(avoidedPurchases.date, previous.to),
        ),
      );

    return {
      month,
      items,
      totals: summarize(items),
      byCategory: groupByCategory(items),
      previous: { count: before?.count ?? 0, cents: before?.cents ?? 0 },
    };
  }

  async function create(
    userId: string,
    input: AvoidedInput,
    now: Date = new Date(),
  ): Promise<AvoidedPurchase> {
    const data = avoidedInputSchema.parse(input);
    assertNotFuture(data.date, now);
    await assertCategory(userId, data.categoryId);

    const [row] = await db
      .insert(avoidedPurchases)
      .values({ userId, ...data })
      .returning();
    return row;
  }

  async function update(
    userId: string,
    id: string,
    input: AvoidedInput,
    now: Date = new Date(),
  ): Promise<AvoidedPurchase> {
    const data = avoidedInputSchema.parse(input);
    const [current] = await db
      .select({ categoryId: avoidedPurchases.categoryId })
      .from(avoidedPurchases)
      .where(owned(userId, id));
    if (!current) throw new AppError("NOT_FOUND", NOT_FOUND_MESSAGE);

    assertNotFuture(data.date, now);
    await assertCategory(userId, data.categoryId, current.categoryId);

    const [row] = await db
      .update(avoidedPurchases)
      .set(data)
      .where(owned(userId, id))
      .returning();
    if (!row) throw new AppError("NOT_FOUND", NOT_FOUND_MESSAGE);
    return row;
  }

  async function setStatus(
    userId: string,
    id: string,
    status: AvoidedStatus,
  ): Promise<AvoidedPurchase> {
    const [row] = await db
      .update(avoidedPurchases)
      .set({ status: avoidedStatusSchema.parse(status) })
      .where(owned(userId, id))
      .returning();
    if (!row) throw new AppError("NOT_FOUND", NOT_FOUND_MESSAGE);
    return row;
  }

  async function remove(userId: string, id: string): Promise<void> {
    const rows = await db
      .delete(avoidedPurchases)
      .where(owned(userId, id))
      .returning({ id: avoidedPurchases.id });
    if (rows.length === 0) throw new AppError("NOT_FOUND", NOT_FOUND_MESSAGE);
  }

  return { list, create, update, setStatus, remove };
}

export const avoidedPurchasesService = createAvoidedPurchasesService(defaultDb);
