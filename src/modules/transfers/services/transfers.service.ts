import { and, desc, eq, gte, lte, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/db/client";
import { accounts, transfers } from "@/db/schema";
import type { Database } from "@/db/types";
import { AppError, type FieldErrors } from "@/lib/errors";

import {
  transferFiltersSchema,
  transferInputSchema,
  type TransferFilters,
  type TransferInput,
} from "../schemas/transfer.schema";
import type { Transfer, TransferListItem, TransferPage } from "../types/transfer.types";

const NOT_FOUND_MESSAGE = "La transferencia no existe.";

export function createTransfersService(db: Database) {
  const owned = (userId: string, id: string) =>
    and(eq(transfers.userId, userId), eq(transfers.id, id));

  async function loadAccount(userId: string, id: string) {
    const [row] = await db
      .select({ id: accounts.id, archivedAt: accounts.archivedAt })
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.id, id)));
    return row;
  }

  /**
   * Both accounts must belong to the user and not be archived (unless the
   * transfer already used them). Field errors never reveal whether an id exists.
   */
  async function assertAccounts(userId: string, input: TransferInput, current?: Transfer) {
    const errors: FieldErrors = {};
    const sides = [
      { field: "fromAccountId", id: input.fromAccountId, previous: current?.fromAccountId, label: "de origen" },
      { field: "toAccountId", id: input.toAccountId, previous: current?.toAccountId, label: "de destino" },
    ] as const;

    for (const side of sides) {
      const account = await loadAccount(userId, side.id);
      if (!account) {
        errors[side.field] = `La cuenta ${side.label} no existe.`;
      } else if (account.archivedAt && side.previous !== account.id) {
        errors[side.field] = `La cuenta ${side.label} está archivada.`;
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new AppError("VALIDATION", "Revisa los datos ingresados.", errors);
    }
  }

  async function create(userId: string, input: TransferInput): Promise<Transfer> {
    const data = transferInputSchema.parse(input);
    await assertAccounts(userId, data);

    const [row] = await db
      .insert(transfers)
      .values({ userId, ...data })
      .returning();
    return row;
  }

  async function update(userId: string, id: string, input: TransferInput): Promise<Transfer> {
    const data = transferInputSchema.parse(input);
    const [current] = await db.select().from(transfers).where(owned(userId, id));
    if (!current) throw new AppError("NOT_FOUND", NOT_FOUND_MESSAGE);
    await assertAccounts(userId, data, current);

    const [row] = await db
      .update(transfers)
      .set(data)
      .where(owned(userId, id))
      .returning();
    return row;
  }

  async function remove(userId: string, id: string): Promise<void> {
    const rows = await db
      .delete(transfers)
      .where(owned(userId, id))
      .returning({ id: transfers.id });
    if (rows.length === 0) throw new AppError("NOT_FOUND", NOT_FOUND_MESSAGE);
  }

  async function list(userId: string, filters: TransferFilters = {}): Promise<TransferPage> {
    const f = transferFiltersSchema.parse(filters);

    const conditions: SQL[] = [eq(transfers.userId, userId)];
    if (f.from) conditions.push(gte(transfers.date, f.from));
    if (f.to) conditions.push(lte(transfers.date, f.to));
    if (f.accountId) {
      // The account may be the origin or the destination.
      conditions.push(
        or(eq(transfers.fromAccountId, f.accountId), eq(transfers.toAccountId, f.accountId))!,
      );
    }
    const where = and(...conditions);

    const fromAccount = alias(accounts, "from_account");
    const toAccount = alias(accounts, "to_account");

    const items: TransferListItem[] = await db
      .select({
        id: transfers.id,
        fromAccountId: transfers.fromAccountId,
        fromAccountName: fromAccount.name,
        toAccountId: transfers.toAccountId,
        toAccountName: toAccount.name,
        amountCents: transfers.amountCents,
        date: transfers.date,
        note: transfers.note,
      })
      .from(transfers)
      .innerJoin(fromAccount, eq(fromAccount.id, transfers.fromAccountId))
      .innerJoin(toAccount, eq(toAccount.id, transfers.toAccountId))
      .where(where)
      .orderBy(desc(transfers.date), desc(transfers.createdAt))
      .limit(f.pageSize)
      .offset((f.page - 1) * f.pageSize);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(transfers)
      .where(where);

    return { items, total, page: f.page, pageSize: f.pageSize };
  }

  return { list, create, update, remove };
}

export const transfersService = createTransfersService(defaultDb);
