import { and, asc, eq, getTableColumns, sql } from "drizzle-orm";

import { db as defaultDb } from "@/db/client";
import { accounts } from "@/db/schema";
import type { Database } from "@/db/types";
import {
  AppError,
  PG_UNIQUE_VIOLATION,
  isInUseError,
  pgErrorCode,
} from "@/lib/errors";

import { accountInputSchema, type AccountInput } from "../schemas/account.schema";
import type { Account, AccountWithBalance } from "../types/account.types";

const DUPLICATE_MESSAGE = "Ya tienes una cuenta con ese nombre.";
const NOT_FOUND_MESSAGE = "La cuenta no existe.";

export function createAccountsService(db: Database) {
  const owned = (userId: string, id: string) =>
    and(eq(accounts.userId, userId), eq(accounts.id, id));

  async function list(
    userId: string,
    options: { includeArchived?: boolean } = {},
  ): Promise<AccountWithBalance[]> {
    // Current balance = initial + income - expense + transfers in - transfers out,
    // in one query for all accounts. Columns are qualified by hand: inside a
    // subquery drizzle omits the table prefix, and an unqualified "id" would
    // resolve to the subquery table's own id.
    const balanceCents = sql<number>`(${accounts.initialBalanceCents}
      + coalesce((
          select sum(case when "transactions"."type" = 'income' then "transactions"."amount_cents" else -"transactions"."amount_cents" end)
          from "transactions"
          where "transactions"."account_id" = "accounts"."id" and "transactions"."user_id" = "accounts"."user_id"
        ), 0)
      + coalesce((
          select sum("transfers"."amount_cents")
          from "transfers"
          where "transfers"."to_account_id" = "accounts"."id" and "transfers"."user_id" = "accounts"."user_id"
        ), 0)
      - coalesce((
          select sum("transfers"."amount_cents")
          from "transfers"
          where "transfers"."from_account_id" = "accounts"."id" and "transfers"."user_id" = "accounts"."user_id"
        ), 0)
    )::float8`;

    return db
      .select({ ...getTableColumns(accounts), balanceCents })
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
    const data = accountInputSchema.parse(input);
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
    const data = accountInputSchema.parse(input);
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

  return {
    list,
    create,
    update,
    archive: (userId: string, id: string) => setArchived(userId, id, true),
    unarchive: (userId: string, id: string) => setArchived(userId, id, false),
    remove,
  };
}

export const accountsService = createAccountsService(defaultDb);
