import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { accounts, avoidedPurchases, categories, transactions, transfers } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import type { Database } from "@/db/types";

import { createWeeklySummaryService } from "./weekly-summary.service";

type TestDb = Awaited<ReturnType<typeof createTestDb>>;

const USER_A = "user_a";
const USER_B = "user_b";
// Sunday 15 Nov 2026 in Lima: week = 9..15 Nov, previous = 2..8 Nov.
const NOW = new Date("2026-11-15T15:00:00Z");

describe("weekly summary service", () => {
  let t: TestDb;
  let service: ReturnType<typeof createWeeklySummaryService>;

  beforeAll(async () => {
    t = await createTestDb();
    service = createWeeklySummaryService(t.db as unknown as Database);
  });

  afterAll(async () => {
    await t.client.close();
  });

  beforeEach(async () => {
    await t.client.exec(
      "TRUNCATE avoided_purchases, transfers, transactions, categories, accounts RESTART IDENTITY CASCADE",
    );
  });

  async function account(
    userId = USER_A,
    name = "BBVA",
    over: Partial<typeof accounts.$inferInsert> = {},
  ) {
    const [row] = await t.db
      .insert(accounts)
      .values({ userId, name, type: "bank", initialBalanceCents: 100000, ...over })
      .returning();
    return row;
  }

  async function category(
    userId = USER_A,
    name = "Comida",
    kind: "income" | "expense" = "expense",
    systemKey: "adjustment_expense" | null = null,
  ) {
    const [row] = await t.db
      .insert(categories)
      .values({ userId, name, kind, icon: "utensils", systemKey })
      .returning();
    return row;
  }

  const tx = (
    userId: string,
    accountId: string,
    categoryId: string,
    type: "income" | "expense",
    amountCents: number,
    date: string,
  ) => t.db.insert(transactions).values({ userId, accountId, categoryId, type, amountCents, date });

  it("sums this week and the same weekdays of last week, excluding adjustments", async () => {
    const a = await account();
    const food = await category();
    const adj = await category(USER_A, "Ajuste", "expense", "adjustment_expense");
    await tx(USER_A, a.id, food.id, "expense", 5000, "2026-11-10"); // this week
    await tx(USER_A, a.id, food.id, "expense", 2000, "2026-11-15"); // this week
    await tx(USER_A, a.id, adj.id, "expense", 9999, "2026-11-11"); // adjustment: ignored
    await tx(USER_A, a.id, food.id, "expense", 3000, "2026-11-04"); // last week
    await tx(USER_A, a.id, food.id, "expense", 1000, "2026-10-30"); // older

    const s = await service.get(USER_A, NOW);
    expect(s.spentCents).toBe(7000);
    expect(s.previousSpentCents).toBe(3000);
    expect(s.byCategory).toEqual([{ categoryId: food.id, name: "Comida", cents: 7000 }]);
  });

  it("limits last week to the same weekday as today", async () => {
    const a = await account();
    const food = await category();
    // Wednesday 11 Nov: last week covers Mon 2 .. Wed 4 only.
    await tx(USER_A, a.id, food.id, "expense", 1000, "2026-11-03");
    await tx(USER_A, a.id, food.id, "expense", 4000, "2026-11-06");
    const s = await service.get(USER_A, new Date("2026-11-11T15:00:00Z"));
    expect(s.previousSpentCents).toBe(1000);
  });

  it("counts only avoided purchases of the week", async () => {
    await t.db.insert(avoidedPurchases).values([
      { userId: USER_A, amountCents: 15000, date: "2026-11-12", status: "avoided" },
      { userId: USER_A, amountCents: 9000, date: "2026-11-12", status: "postponed" },
      { userId: USER_A, amountCents: 7000, date: "2026-11-05", status: "avoided" },
    ]);
    const s = await service.get(USER_A, NOW);
    expect(s.avoidedCount).toBe(1);
    expect(s.avoidedCents).toBe(15000);
  });

  it("derives the available money at the start of the week from today's balances", async () => {
    const main = await account(USER_A, "BBVA", { initialBalanceCents: 100000 });
    const savings = await account(USER_A, "Ahorro", { initialBalanceCents: 0, includeInAvailable: false });
    const food = await category();
    const salary = await category(USER_A, "Sueldo", "income");

    await tx(USER_A, main.id, salary.id, "income", 156000, "2026-11-02"); // before the week
    await tx(USER_A, main.id, food.id, "expense", 20000, "2026-11-10"); // this week
    // This week: 80000 moved to the reserve (savings is excluded from available).
    await t.db.insert(transfers).values({
      userId: USER_A,
      fromAccountId: main.id,
      toAccountId: savings.id,
      amountCents: 80000,
      date: "2026-11-12",
    });

    const s = await service.get(USER_A, NOW);
    // Start of week: main = 100000 + 156000 = 256000. Savings excluded.
    expect(s.availableAtStartCents).toBe(256000);
    // Now: main = 256000 - 20000 - 80000 = 156000.
    expect(s.availableNowCents).toBe(156000);
  });

  it("subtracts card debt in both moments", async () => {
    await account(USER_A, "BBVA", { initialBalanceCents: 100000 });
    const card = await account(USER_A, "Visa", { type: "card", initialBalanceCents: -30000 });
    const food = await category();
    await tx(USER_A, card.id, food.id, "expense", 10000, "2026-11-13");

    const s = await service.get(USER_A, NOW);
    expect(s.availableAtStartCents).toBe(70000); // 100000 - 30000 debt
    expect(s.availableNowCents).toBe(60000); // debt grew by 10000
  });

  it("isolates by user", async () => {
    const a = await account(USER_A);
    const food = await category();
    await tx(USER_A, a.id, food.id, "expense", 5000, "2026-11-10");
    const other = await service.get(USER_B, NOW);
    expect(other.spentCents).toBe(0);
    expect(other.byCategory).toEqual([]);
    expect(other.availableNowCents).toBe(0);
  });
});
