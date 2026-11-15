import { and, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";

import { db as defaultDb } from "@/db/client";
import { avoidedPurchases, categories, transactions, transfers } from "@/db/schema";
import type { Database } from "@/db/types";
import { createAccountsService } from "@/modules/accounts/services/accounts.service";
import { computeAvailableMoney } from "@/modules/available-money/available-money";

import type { WeeklySummary } from "../types/weekly-summary.types";
import { weekRanges } from "../week-math";

const TOP_CATEGORIES = 3;

export function createWeeklySummaryService(db: Database) {
  const accountsService = createAccountsService(db);

  /** Net movement per account with date on or after `from` (future dates included). */
  async function movementSince(userId: string, from: string): Promise<Map<string, number>> {
    const movement = new Map<string, number>();
    const add = (accountId: string, cents: number) =>
      movement.set(accountId, (movement.get(accountId) ?? 0) + cents);

    const txRows = await db
      .select({
        accountId: transactions.accountId,
        delta: sql<number>`sum(case when ${transactions.type} = 'income' then ${transactions.amountCents} else -${transactions.amountCents} end)::float8`,
      })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), gte(transactions.date, from)))
      .groupBy(transactions.accountId);
    for (const r of txRows) add(r.accountId, r.delta);

    const received = await db
      .select({
        accountId: transfers.toAccountId,
        cents: sql<number>`sum(${transfers.amountCents})::float8`,
      })
      .from(transfers)
      .where(and(eq(transfers.userId, userId), gte(transfers.date, from)))
      .groupBy(transfers.toAccountId);
    for (const r of received) add(r.accountId, r.cents);

    const sent = await db
      .select({
        accountId: transfers.fromAccountId,
        cents: sql<number>`sum(${transfers.amountCents})::float8`,
      })
      .from(transfers)
      .where(and(eq(transfers.userId, userId), gte(transfers.date, from)))
      .groupBy(transfers.fromAccountId);
    for (const r of sent) add(r.accountId, -r.cents);

    return movement;
  }

  async function get(userId: string, now: Date = new Date()): Promise<WeeklySummary> {
    const week = weekRanges(now);
    const inRange = (r: { from: string; to: string }) =>
      sql`${transactions.date} >= ${r.from}::date and ${transactions.date} <= ${r.to}::date`;
    const isSpending = and(
      eq(transactions.userId, userId),
      eq(transactions.type, "expense"),
      isNull(categories.systemKey),
    );

    const [totals] = await db
      .select({
        spent: sql<number>`coalesce(sum(${transactions.amountCents}) filter (where ${inRange(week)}), 0)::float8`,
        previous: sql<number>`coalesce(sum(${transactions.amountCents}) filter (where ${inRange(week.previous)}), 0)::float8`,
      })
      .from(transactions)
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .where(isSpending);

    const spent = sql<number>`sum(${transactions.amountCents})::float8`;
    const byCategory = await db
      .select({ categoryId: categories.id, name: categories.name, cents: spent })
      .from(transactions)
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .where(and(isSpending, gte(transactions.date, week.from), lte(transactions.date, week.to)))
      .groupBy(categories.id)
      .orderBy(desc(spent), categories.name)
      .limit(TOP_CATEGORIES);

    const [avoided] = await db
      .select({
        count: sql<number>`count(*)::int`,
        cents: sql<number>`coalesce(sum(${avoidedPurchases.amountCents}), 0)::float8`,
      })
      .from(avoidedPurchases)
      .where(
        and(
          eq(avoidedPurchases.userId, userId),
          eq(avoidedPurchases.status, "avoided"),
          gte(avoidedPurchases.date, week.from),
          lte(avoidedPurchases.date, week.to),
        ),
      );

    // Available money now, and at the start of the week: today's balances minus
    // what moved since Monday in each account.
    const accounts = await accountsService.list(userId);
    const movement = await movementSince(userId, week.from);
    const view = (list: typeof accounts) =>
      list.map((a) => ({
        type: a.type,
        balanceCents: a.balanceCents,
        archivedAt: a.archivedAt,
        includeInAvailable: a.includeInAvailable,
      }));
    const now_ = computeAvailableMoney(view(accounts), now);
    const atStart = computeAvailableMoney(
      view(accounts.map((a) => ({ ...a, balanceCents: a.balanceCents - (movement.get(a.id) ?? 0) }))),
      now,
    );

    return {
      from: week.from,
      to: week.to,
      spentCents: totals?.spent ?? 0,
      previousSpentCents: totals?.previous ?? 0,
      byCategory,
      avoidedCount: avoided.count,
      avoidedCents: avoided.cents,
      availableAtStartCents: atStart.availableCents,
      availableNowCents: now_.availableCents,
    };
  }

  return { get };
}

export const weeklySummaryService = createWeeklySummaryService(defaultDb);
