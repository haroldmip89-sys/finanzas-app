import { and, asc, eq, getTableColumns, isNull, sql } from "drizzle-orm";

import { db as defaultDb } from "@/db/client";
import { accounts, categories, transactions } from "@/db/schema";
import type { Database } from "@/db/types";
import { currentMonthRange, previousMonthRange } from "@/lib/dates";
import {
  AppError,
  PG_UNIQUE_VIOLATION,
  isInUseError,
  pgErrorCode,
} from "@/lib/errors";

import { accountInputSchema, type AccountInput } from "../schemas/account.schema";
import { accountBalanceSql } from "./account-balance";
import type { Account, AccountWithBalance } from "../types/account.types";

const DUPLICATE_MESSAGE = "Ya tienes una cuenta con ese nombre.";
const NOT_FOUND_MESSAGE = "La cuenta no existe.";

/** Cards are debt, never a reserve: they always stay "included". */
function normalize(data: AccountInput): AccountInput {
  return data.type === "card" ? { ...data, includeInAvailable: true } : data;
}

export function createAccountsService(db: Database) {
  const owned = (userId: string, id: string) =>
    and(eq(accounts.userId, userId), eq(accounts.id, id));

  async function list(
    userId: string,
    options: { includeArchived?: boolean } = {},
  ): Promise<AccountWithBalance[]> {
    return db
      .select({ ...getTableColumns(accounts), balanceCents: accountBalanceSql })
      .from(accounts)
      .where(
        options.includeArchived
          ? eq(accounts.userId, userId)
          : and(eq(accounts.userId, userId), sql`${accounts.archivedAt} IS NULL`),
      )
      .orderBy(sql`(${accounts.archivedAt} IS NOT NULL)`, asc(accounts.name));
  }

  async function assertNameFree(userId: string, name: string, exceptId?: string) {
    const rows = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(
        and(eq(accounts.userId, userId), sql`lower(${accounts.name}) = lower(${name})`),
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

  async function create(userId: string, input: AccountInput): Promise<Account> {
    const data = normalize(accountInputSchema.parse(input));
    await assertNameFree(userId, data.name);

    try {
      const [row] = await db
        .insert(accounts)
        .values({ userId, ...data })
        .returning();
      return row;
    } catch (error) {
      return mapWriteError(error);
    }
  }

  async function update(
    userId: string,
    id: string,
    input: AccountInput,
  ): Promise<Account> {
    const data = normalize(accountInputSchema.parse(input));
    const [current] = await db.select({ id: accounts.id }).from(accounts).where(owned(userId, id));
    if (!current) throw new AppError("NOT_FOUND", NOT_FOUND_MESSAGE);
    await assertNameFree(userId, data.name, id);

    try {
      const [row] = await db
        .update(accounts)
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
  ): Promise<Account> {
    const [row] = await db
      .update(accounts)
      .set({ archivedAt: archived ? new Date() : null })
      .where(owned(userId, id))
      .returning();
    if (!row) throw new AppError("NOT_FOUND", NOT_FOUND_MESSAGE);
    return row;
  }

  async function remove(userId: string, id: string): Promise<void> {
    try {
      const rows = await db
        .delete(accounts)
        .where(owned(userId, id))
        .returning({ id: accounts.id });
      if (rows.length === 0) throw new AppError("NOT_FOUND", NOT_FOUND_MESSAGE);
    } catch (error) {
      if (isInUseError(error)) {
        throw new AppError(
          "IN_USE",
          "No se puede eliminar: tiene transacciones o transferencias. Archívala en su lugar.",
        );
      }
      throw error;
    }
  }

  /**
   * Expenses registered on card accounts this month and last month (Lima).
   * Balance adjustments are not purchases and card payments are transfers, so
   * neither is counted. One query for both months.
   */
  async function cardSpending(
    userId: string,
    now: Date = new Date(),
  ): Promise<{ currentMonthCents: number; previousMonthCents: number }> {
    const current = currentMonthRange(now);
    const previous = previousMonthRange(now);
    const inRange = (range: { from: string; to: string }) =>
      sql`${transactions.date} >= ${range.from}::date and ${transactions.date} <= ${range.to}::date`;

    const [row] = await db
      .select({
        currentMonthCents: sql<number>`coalesce(sum(${transactions.amountCents}) filter (where ${inRange(current)}), 0)::float8`,
        previousMonthCents: sql<number>`coalesce(sum(${transactions.amountCents}) filter (where ${inRange(previous)}), 0)::float8`,
      })
      .from(transactions)
      .innerJoin(accounts, eq(accounts.id, transactions.accountId))
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .where(
        and(
          eq(transactions.userId, userId),
          eq(accounts.type, "card"),
          eq(transactions.type, "expense"),
          isNull(categories.systemKey),
        ),
      );

    return {
      currentMonthCents: row?.currentMonthCents ?? 0,
      previousMonthCents: row?.previousMonthCents ?? 0,
    };
  }

  return {
    list,
    cardSpending,
    create,
    update,
    archive: (userId: string, id: string) => setArchived(userId, id, true),
    unarchive: (userId: string, id: string) => setArchived(userId, id, false),
    remove,
  };
}

export const accountsService = createAccountsService(defaultDb);
