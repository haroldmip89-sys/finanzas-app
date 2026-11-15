import { and, asc, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";

import { db as defaultDb } from "@/db/client";
import { budgets, categories, transactions } from "@/db/schema";
import type { Database } from "@/db/types";
import { addMonths, monthKeyRange } from "@/lib/dates";
import { AppError, PG_UNIQUE_VIOLATION, pgErrorCode } from "@/lib/errors";

import {
  budgetCreateSchema,
  budgetUpdateSchema,
  monthSchema,
  type BudgetCreateInput,
  type BudgetUpdateInput,
} from "../schemas/budget.schema";
import type {
  Budget,
  BudgetListItem,
  BudgetsOverview,
  UnbudgetedItem,
} from "../types/budget.types";

const NOT_FOUND_MESSAGE = "El presupuesto no existe.";
const DUPLICATE_MESSAGE = "Ya hay un presupuesto para esta categoría en este mes.";

function duplicateError(): AppError {
  return new AppError("CONFLICT", DUPLICATE_MESSAGE, { categoryId: DUPLICATE_MESSAGE });
}

export function createBudgetsService(db: Database) {
  const owned = (userId: string, id: string) =>
    and(eq(budgets.userId, userId), eq(budgets.id, id));

  /**
   * The budgets of a month with what was spent in each category, the spending
   * of categories that have no budget, and the month totals.
   *
   * Spent = expenses of the category during the month, in every account (card
   * purchases count). Income, transfers and balance adjustments do not.
   */
  async function list(userId: string, monthInput: string): Promise<BudgetsOverview> {
    const month = monthSchema.parse(monthInput);
    const { from, to } = monthKeyRange(month);
    const previousFrom = monthKeyRange(addMonths(month, -1)).from;

    // Columns of the subquery are qualified by hand: inside it drizzle omits
    // the table prefix and an unqualified "category_id" would be ambiguous.
    const spent = sql<number>`coalesce((
      select sum("transactions"."amount_cents")
      from "transactions"
      where "transactions"."category_id" = "budgets"."category_id"
        and "transactions"."user_id" = "budgets"."user_id"
        and "transactions"."type" = 'expense'
        and "transactions"."date" >= ${from}::date
        and "transactions"."date" <= ${to}::date
    ), 0)::float8`;

    const rows: BudgetListItem[] = await db
      .select({
        id: budgets.id,
        categoryId: budgets.categoryId,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        amountCents: budgets.amountCents,
        spentCents: spent,
      })
      .from(budgets)
      .innerJoin(categories, eq(categories.id, budgets.categoryId))
      .where(and(eq(budgets.userId, userId), eq(budgets.month, from)));

    // Most consumed first, then by name.
    const items = [...rows].sort(
      (a, b) =>
        b.spentCents / b.amountCents - a.spentCents / a.amountCents ||
        a.categoryName.localeCompare(b.categoryName, "es"),
    );

    const totalSpent = sql<number>`sum(${transactions.amountCents})::float8`;
    const unbudgeted: UnbudgetedItem[] = await db
      .select({
        categoryId: categories.id,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        spentCents: totalSpent,
      })
      .from(transactions)
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "expense"),
          gte(transactions.date, from),
          lte(transactions.date, to),
          isNull(categories.systemKey),
          sql`not exists (
            select 1 from "budgets"
            where "budgets"."category_id" = "categories"."id"
              and "budgets"."user_id" = ${userId}
              and "budgets"."month" = ${from}::date
          )`,
        ),
      )
      .groupBy(categories.id)
      .orderBy(desc(totalSpent), asc(categories.name));

    const [{ count: previousCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(budgets)
      .where(and(eq(budgets.userId, userId), eq(budgets.month, previousFrom)));

    const budgetedCents = items.reduce((sum, i) => sum + i.amountCents, 0);
    const spentCents = items.reduce((sum, i) => sum + i.spentCents, 0);

    return {
      month,
      items,
      unbudgeted,
      totals: { budgetedCents, spentCents, remainingCents: budgetedCents - spentCents },
      previousMonthHasBudgets: previousCount > 0,
    };
  }

  /**
   * The category must belong to the user, be an expense category, not be a
   * system one (balance adjustments) and not be archived.
   */
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
    else if (category.kind !== "expense") message = "Solo se presupuestan categorías de gasto.";
    else if (category.archivedAt) message = "La categoría está archivada.";

    if (message) {
      throw new AppError("VALIDATION", "Revisa los datos ingresados.", { categoryId: message });
    }
  }

  async function create(userId: string, input: BudgetCreateInput): Promise<Budget> {
    const data = budgetCreateSchema.parse(input);
    await assertCategory(userId, data.categoryId);
    const { from } = monthKeyRange(data.month);

    const [existing] = await db
      .select({ id: budgets.id })
      .from(budgets)
      .where(
        and(
          eq(budgets.userId, userId),
          eq(budgets.categoryId, data.categoryId),
          eq(budgets.month, from),
        ),
      );
    if (existing) throw duplicateError();

    try {
      const [row] = await db
        .insert(budgets)
        .values({
          userId,
          categoryId: data.categoryId,
          month: from,
          amountCents: data.amountCents,
        })
        .returning();
      return row;
    } catch (error) {
      if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) throw duplicateError();
      throw error;
    }
  }

  async function update(
    userId: string,
    id: string,
    input: BudgetUpdateInput,
  ): Promise<Budget> {
    const data = budgetUpdateSchema.parse(input);
    const [row] = await db
      .update(budgets)
      .set({ amountCents: data.amountCents })
      .where(owned(userId, id))
      .returning();
    if (!row) throw new AppError("NOT_FOUND", NOT_FOUND_MESSAGE);
    return row;
  }

  async function remove(userId: string, id: string): Promise<void> {
    const rows = await db
      .delete(budgets)
      .where(owned(userId, id))
      .returning({ id: budgets.id });
    if (rows.length === 0) throw new AppError("NOT_FOUND", NOT_FOUND_MESSAGE);
  }

  /**
   * Copies the budgets of the previous month into this one, for active
   * categories that do not have one yet. Existing budgets are never touched;
   * ON CONFLICT DO NOTHING also makes repeated or concurrent calls safe.
   */
  async function copyFromPreviousMonth(
    userId: string,
    monthInput: string,
  ): Promise<{ created: number }> {
    const month = monthSchema.parse(monthInput);
    const { from } = monthKeyRange(month);
    const previousFrom = monthKeyRange(addMonths(month, -1)).from;

    const previous = await db
      .select({ categoryId: budgets.categoryId, amountCents: budgets.amountCents })
      .from(budgets)
      .innerJoin(categories, eq(categories.id, budgets.categoryId))
      .where(
        and(
          eq(budgets.userId, userId),
          eq(budgets.month, previousFrom),
          isNull(categories.archivedAt),
        ),
      );

    if (previous.length === 0) {
      throw new AppError("VALIDATION", "El mes anterior no tiene presupuestos para copiar.");
    }

    const created = await db
      .insert(budgets)
      .values(previous.map((p) => ({ userId, month: from, ...p })))
      .onConflictDoNothing()
      .returning({ id: budgets.id });

    return { created: created.length };
  }

  return { list, create, update, remove, copyFromPreviousMonth };
}

export const budgetsService = createBudgetsService(defaultDb);
