import { and, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";

import { db as defaultDb } from "@/db/client";
import { categories, transactions } from "@/db/schema";
import type { Database } from "@/db/types";

import { comparableRanges, toDailySeries } from "../dashboard-math";
import type { DailySpending, SpendingSummary } from "../types/dashboard.types";

export function createDashboardService(db: Database) {
  /**
   * Expenses of the month so far and of last month up to the same day, plus
   * this month's spending by category. Balance adjustments are not expenses
   * (system categories) and card payments are transfers, so neither counts.
   */
  async function spendingSummary(
    userId: string,
    now: Date = new Date(),
  ): Promise<SpendingSummary> {
    const { current, previous } = comparableRanges(now);
    const inRange = (range: { from: string; to: string }) =>
      sql`${transactions.date} >= ${range.from}::date and ${transactions.date} <= ${range.to}::date`;
    const isSpending = and(
      eq(transactions.userId, userId),
      eq(transactions.type, "expense"),
      isNull(categories.systemKey),
    );

    const [totals] = await db
      .select({
        currentCents: sql<number>`coalesce(sum(${transactions.amountCents}) filter (where ${inRange(current)}), 0)::float8`,
        previousCents: sql<number>`coalesce(sum(${transactions.amountCents}) filter (where ${inRange(previous)}), 0)::float8`,
      })
      .from(transactions)
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .where(isSpending);

    const spent = sql<number>`sum(${transactions.amountCents})::float8`;
    const byCategory = await db
      .select({ categoryId: categories.id, name: categories.name, cents: spent })
      .from(transactions)
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .where(
        and(isSpending, gte(transactions.date, current.from), lte(transactions.date, current.to)),
      )
      .groupBy(categories.id)
      .orderBy(desc(spent), categories.name);

    return {
      currentCents: totals?.currentCents ?? 0,
      previousCents: totals?.previousCents ?? 0,
      byCategory,
    };
  }

  /**
   * Spending per day of this month (day 1 to today) and of last month (day 1
   * to the same day number), with 0 on days without spending. One query.
   */
  async function dailySpending(
    userId: string,
    now: Date = new Date(),
  ): Promise<DailySpending> {
    const { current, previous } = comparableRanges(now);
    const day = sql<string>`${transactions.date}::text`;
    const spent = sql<number>`sum(${transactions.amountCents})::float8`;

    const rows = await db
      .select({ date: day, cents: spent })
      .from(transactions)
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "expense"),
          isNull(categories.systemKey),
          or(
            and(gte(transactions.date, current.from), lte(transactions.date, current.to)),
            and(gte(transactions.date, previous.from), lte(transactions.date, previous.to)),
          ),
        ),
      )
      .groupBy(day);

    const length = (range: { from: string; to: string }) =>
      Number(range.to.slice(8)) - Number(range.from.slice(8)) + 1;

    return {
      currentDaily: toDailySeries(rows, current.from, length(current)),
      previousDaily: toDailySeries(rows, previous.from, length(previous)),
    };
  }

  return { spendingSummary, dailySpending };
}

export const dashboardService = createDashboardService(defaultDb);
