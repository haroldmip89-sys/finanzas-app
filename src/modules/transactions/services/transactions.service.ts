import { and, asc, desc, eq, gte, isNull, lte, sql, type SQL } from "drizzle-orm";

import { db as defaultDb } from "@/db/client";
import { accounts, categories, transactions } from "@/db/schema";
import type { Database } from "@/db/types";
import { addDays, todayInLima } from "@/lib/dates";
import { AppError, type FieldErrors } from "@/lib/errors";

import {
  transactionFiltersSchema,
  transactionInputSchema,
  type TransactionFilters,
  type TransactionInput,
} from "../schemas/transaction.schema";
import type {
  FrequentCategory,
  Transaction,
  TransactionListItem,
  TransactionPage,
} from "../types/transaction.types";

const NOT_FOUND_MESSAGE = "La transacción no existe.";
const KIND_LABEL = { income: "ingreso", expense: "gasto" } as const;

function validationError(fieldErrors: FieldErrors): AppError {
  return new AppError("VALIDATION", "Revisa los datos ingresados.", fieldErrors);
}

export function createTransactionsService(db: Database) {
  const owned = (userId: string, id: string) =>
    and(eq(transactions.userId, userId), eq(transactions.id, id));

  /**
   * The account and category must belong to the user, not be archived (unless
   * the transaction already used them) and the type must match the category
   * kind. Returns field errors instead of leaking whether an id exists.
   */
  async function assertReferences(
    userId: string,
    input: TransactionInput,
    current?: Transaction,
  ) {
    const errors: FieldErrors = {};

    const [account] = await db
      .select({ id: accounts.id, archivedAt: accounts.archivedAt })
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.id, input.accountId)));
    if (!account) {
      errors.accountId = "La cuenta no existe.";
    } else if (account.archivedAt && current?.accountId !== account.id) {
      errors.accountId = "La cuenta está archivada.";
    }

    const [category] = await db
      .select({
        id: categories.id,
        kind: categories.kind,
        archivedAt: categories.archivedAt,
        systemKey: categories.systemKey,
      })
      .from(categories)
      .where(and(eq(categories.userId, userId), eq(categories.id, input.categoryId)));
    if (!category || category.systemKey) {
      // System categories (balance adjustments) are not usable here; they
      // are reported as missing so their existence is not revealed.
      errors.categoryId = "La categoría no existe.";
    } else if (category.archivedAt && current?.categoryId !== category.id) {
      errors.categoryId = "La categoría está archivada.";
    } else if (category.kind !== input.type) {
      errors.categoryId = `La categoría no es de ${KIND_LABEL[input.type]}.`;
    }

    if (Object.keys(errors).length > 0) throw validationError(errors);
  }

  async function create(userId: string, input: TransactionInput): Promise<Transaction> {
    const data = transactionInputSchema.parse(input);
    await assertReferences(userId, data);

    const [row] = await db
      .insert(transactions)
      .values({ userId, ...data })
      .returning();
    return row;
  }

  async function update(
    userId: string,
    id: string,
    input: TransactionInput,
  ): Promise<Transaction> {
    const data = transactionInputSchema.parse(input);
    const [current] = await db.select().from(transactions).where(owned(userId, id));
    if (!current) throw new AppError("NOT_FOUND", NOT_FOUND_MESSAGE);
    const [currentCategory] = await db
      .select({ systemKey: categories.systemKey })
      .from(categories)
      .where(eq(categories.id, current.categoryId));
    if (currentCategory?.systemKey) {
      throw new AppError(
        "VALIDATION",
        "Los ajustes de saldo no se pueden editar. Elimínalo y calibra de nuevo.",
      );
    }
    await assertReferences(userId, data, current);

    const [row] = await db
      .update(transactions)
      .set(data)
      .where(owned(userId, id))
      .returning();
    return row;
  }

  async function remove(userId: string, id: string): Promise<void> {
    const rows = await db
      .delete(transactions)
      .where(owned(userId, id))
      .returning({ id: transactions.id });
    if (rows.length === 0) throw new AppError("NOT_FOUND", NOT_FOUND_MESSAGE);
  }

  async function list(
    userId: string,
    filters: TransactionFilters = {},
  ): Promise<TransactionPage> {
    const f = transactionFiltersSchema.parse(filters);

    const conditions: SQL[] = [eq(transactions.userId, userId)];
    if (f.from) conditions.push(gte(transactions.date, f.from));
    if (f.to) conditions.push(lte(transactions.date, f.to));
    if (f.type) conditions.push(eq(transactions.type, f.type));
    if (f.accountId) conditions.push(eq(transactions.accountId, f.accountId));
    if (f.categoryId) conditions.push(eq(transactions.categoryId, f.categoryId));
    const where = and(...conditions);

    const items: TransactionListItem[] = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        amountCents: transactions.amountCents,
        date: transactions.date,
        note: transactions.note,
        accountId: transactions.accountId,
        accountName: accounts.name,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        isAdjustment: sql<boolean>`${categories.systemKey} IS NOT NULL`,
      })
      .from(transactions)
      .innerJoin(accounts, eq(accounts.id, transactions.accountId))
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .where(where)
      .orderBy(desc(transactions.date), desc(transactions.createdAt))
      .limit(f.pageSize)
      .offset((f.page - 1) * f.pageSize);

    const [aggregate] = await db
      .select({
        total: sql<number>`count(*)::int`,
        // Balance adjustments are not income or expense: they are left out of the totals.
        incomeCents: sql<number>`coalesce(sum(case when ${transactions.type} = 'income' and ${categories.systemKey} is null then ${transactions.amountCents} else 0 end), 0)::float8`,
        expenseCents: sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' and ${categories.systemKey} is null then ${transactions.amountCents} else 0 end), 0)::float8`,
      })
      .from(transactions)
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .where(where);

    return {
      items,
      total: aggregate.total,
      page: f.page,
      pageSize: f.pageSize,
      totals: {
        incomeCents: aggregate.incomeCents,
        expenseCents: aggregate.expenseCents,
      },
    };
  }

  /**
   * Active categories of a type, most used first (transactions of the last 90
   * days in Lima); unused ones follow by name. One query, no N+1.
   */
  async function frequentCategories(
    userId: string,
    type: "income" | "expense",
    limit = 6,
    now: Date = new Date(),
  ): Promise<FrequentCategory[]> {
    const since = addDays(todayInLima(now), -90);
    const uses = sql<number>`count(${transactions.id})::int`;

    return db
      .select({
        id: categories.id,
        name: categories.name,
        icon: categories.icon,
        uses,
      })
      .from(categories)
      .leftJoin(
        transactions,
        and(
          eq(transactions.categoryId, categories.id),
          eq(transactions.userId, userId),
          gte(transactions.date, since),
        ),
      )
      .where(
        and(
          eq(categories.userId, userId),
          eq(categories.kind, type),
          isNull(categories.archivedAt),
          isNull(categories.systemKey),
        ),
      )
      .groupBy(categories.id)
      .orderBy(desc(uses), asc(categories.name))
      .limit(limit);
  }

  return { list, create, update, remove, frequentCategories };
}

export const transactionsService = createTransactionsService(defaultDb);
