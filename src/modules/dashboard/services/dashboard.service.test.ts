import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { accounts, categories, transactions, transfers } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import type { Database } from "@/db/types";

import { createDashboardService } from "./dashboard.service";

type TestDb = Awaited<ReturnType<typeof createTestDb>>;

const USER_A = "user_a";
const USER_B = "user_b";
// 15 Nov 2026 in Lima: this month is 1-15 Nov, the comparison is 1-15 Oct.
const NOW = new Date("2026-11-15T15:00:00Z");

describe("dashboard service", () => {
  let t: TestDb;
  let service: ReturnType<typeof createDashboardService>;

  beforeAll(async () => {
    t = await createTestDb();
    service = createDashboardService(t.db as unknown as Database);
  });

  afterAll(async () => {
    await t.client.close();
  });

  beforeEach(async () => {
    await t.client.exec(
      "TRUNCATE budgets, transactions, transfers, categories, accounts RESTART IDENTITY CASCADE",
    );
  });

  async function seedAccount(userId = USER_A, name = "BBVA") {
    const [row] = await t.db.insert(accounts).values({ userId, name, type: "bank" }).returning();
    return row;
  }

  async function seedCategory(
    userId = USER_A,
    name = "Comida",
    kind: "income" | "expense" = "expense",
    systemKey: "adjustment_expense" | "adjustment_income" | null = null,
  ) {
    const [row] = await t.db
      .insert(categories)
      .values({ userId, name, kind, icon: "utensils", systemKey })
      .returning();
    return row;
  }

  async function add(
    accountId: string,
    categoryId: string,
    cents: number,
    date: string,
    type: "income" | "expense" = "expense",
    userId = USER_A,
  ) {
    await t.db
      .insert(transactions)
      .values({ userId, accountId, categoryId, type, amountCents: cents, date });
  }

  it("is empty for a user without data", async () => {
    const result = await service.spendingSummary(USER_A, NOW);

    expect(result).toEqual({ currentCents: 0, previousCents: 0, byCategory: [] });
  });

  it("adds this month's expenses and last month's up to the same day", async () => {
    const acc = await seedAccount();
    const food = await seedCategory();
    await add(acc.id, food.id, 1000, "2026-11-02");
    await add(acc.id, food.id, 2000, "2026-11-15");
    await add(acc.id, food.id, 500, "2026-10-01");
    await add(acc.id, food.id, 700, "2026-10-15");
    // Later than day 15 of last month and in the future: both left out.
    await add(acc.id, food.id, 9999, "2026-10-16");
    await add(acc.id, food.id, 8888, "2026-11-16");
    // Older than last month.
    await add(acc.id, food.id, 7777, "2026-09-10");

    const result = await service.spendingSummary(USER_A, NOW);

    expect(result.currentCents).toBe(3000);
    expect(result.previousCents).toBe(1200);
  });

  it("does not count income, balance adjustments or transfers", async () => {
    const acc = await seedAccount();
    const other = await seedAccount(USER_A, "Efectivo");
    const food = await seedCategory();
    const salary = await seedCategory(USER_A, "Sueldo", "income");
    const adjustment = await seedCategory(USER_A, "Ajuste", "expense", "adjustment_expense");
    await add(acc.id, food.id, 1000, "2026-11-03");
    await add(acc.id, salary.id, 300000, "2026-11-03", "income");
    await add(acc.id, adjustment.id, 4000, "2026-11-03");
    await t.db.insert(transfers).values({
      userId: USER_A,
      fromAccountId: acc.id,
      toAccountId: other.id,
      amountCents: 5000,
      date: "2026-11-03",
    });

    const result = await service.spendingSummary(USER_A, NOW);

    expect(result.currentCents).toBe(1000);
    expect(result.byCategory.map((c) => c.name)).toEqual(["Comida"]);
  });

  it("groups this month's spending by category, biggest first", async () => {
    const acc = await seedAccount();
    const food = await seedCategory();
    const fun = await seedCategory(USER_A, "Ocio");
    const bus = await seedCategory(USER_A, "Transporte");
    await add(acc.id, food.id, 1000, "2026-11-02");
    await add(acc.id, food.id, 500, "2026-11-04");
    await add(acc.id, fun.id, 3000, "2026-11-05");
    await add(acc.id, bus.id, 1500, "2026-11-06");
    // Last month does not appear in the breakdown.
    await add(acc.id, bus.id, 9000, "2026-10-06");

    const result = await service.spendingSummary(USER_A, NOW);

    expect(result.byCategory.map((c) => [c.name, c.cents])).toEqual([
      ["Ocio", 3000],
      ["Comida", 1500],
      ["Transporte", 1500],
    ]);
    expect(result.byCategory.reduce((s, c) => s + c.cents, 0)).toBe(result.currentCents);
  });

  it("only sees the user's own data", async () => {
    const mine = await seedAccount(USER_A);
    const theirs = await seedAccount(USER_B, "Otra");
    const foodA = await seedCategory(USER_A);
    const foodB = await seedCategory(USER_B);
    await add(mine.id, foodA.id, 1000, "2026-11-02");
    await add(theirs.id, foodB.id, 777000, "2026-11-02", "expense", USER_B);

    const result = await service.spendingSummary(USER_A, NOW);

    expect(result.currentCents).toBe(1000);
    expect(result.byCategory).toHaveLength(1);
  });

  it("stops last month at its last day when it is shorter", async () => {
    const acc = await seedAccount();
    const food = await seedCategory();
    // 31 Mar: February (28 days) is compared in full.
    await add(acc.id, food.id, 1000, "2027-02-28");
    await add(acc.id, food.id, 400, "2027-03-31");

    const result = await service.spendingSummary(USER_A, new Date("2027-03-31T15:00:00Z"));

    expect(result.previousCents).toBe(1000);
    expect(result.currentCents).toBe(400);
  });
  describe("dailySpending", () => {
    it("has one value per day, with zeros where nothing was spent", async () => {
      const acc = await seedAccount();
      const food = await seedCategory();
      await add(acc.id, food.id, 1000, "2026-11-02");
      await add(acc.id, food.id, 500, "2026-11-02");
      await add(acc.id, food.id, 2000, "2026-11-15");
      await add(acc.id, food.id, 700, "2026-10-01");
      await add(acc.id, food.id, 300, "2026-10-15");

      const result = await service.dailySpending(USER_A, NOW);

      expect(result.currentDaily).toHaveLength(15);
      expect(result.currentDaily[0]).toBe(0);
      expect(result.currentDaily[1]).toBe(1500);
      expect(result.currentDaily[14]).toBe(2000);
      expect(result.previousDaily).toHaveLength(15);
      expect(result.previousDaily[0]).toBe(700);
      expect(result.previousDaily[14]).toBe(300);
    });

    it("leaves out what is after today and after the same day of last month", async () => {
      const acc = await seedAccount();
      const food = await seedCategory();
      await add(acc.id, food.id, 111, "2026-11-16");
      await add(acc.id, food.id, 222, "2026-10-16");
      await add(acc.id, food.id, 333, "2026-09-30");

      const result = await service.dailySpending(USER_A, NOW);

      expect(result.currentDaily.reduce((a, b) => a + b, 0)).toBe(0);
      expect(result.previousDaily.reduce((a, b) => a + b, 0)).toBe(0);
    });

    it("does not count income, balance adjustments or transfers", async () => {
      const acc = await seedAccount();
      const other = await seedAccount(USER_A, "Efectivo");
      const food = await seedCategory();
      const salary = await seedCategory(USER_A, "Sueldo", "income");
      const adjustment = await seedCategory(USER_A, "Ajuste", "expense", "adjustment_expense");
      await add(acc.id, food.id, 1000, "2026-11-03");
      await add(acc.id, salary.id, 300000, "2026-11-03", "income");
      await add(acc.id, adjustment.id, 4000, "2026-11-03");
      await t.db.insert(transfers).values({
        userId: USER_A,
        fromAccountId: acc.id,
        toAccountId: other.id,
        amountCents: 5000,
        date: "2026-11-03",
      });

      const result = await service.dailySpending(USER_A, NOW);

      expect(result.currentDaily[2]).toBe(1000);
      expect(result.currentDaily.reduce((a, b) => a + b, 0)).toBe(1000);
    });

    it("only sees the user's own data", async () => {
      const mine = await seedAccount(USER_A);
      const theirs = await seedAccount(USER_B, "Otra");
      const foodA = await seedCategory(USER_A);
      const foodB = await seedCategory(USER_B);
      await add(mine.id, foodA.id, 1000, "2026-11-02");
      await add(theirs.id, foodB.id, 777000, "2026-11-02", "expense", USER_B);

      const result = await service.dailySpending(USER_A, NOW);

      expect(result.currentDaily[1]).toBe(1000);
    });

    it("compares 31 March with the whole of February (28 days)", async () => {
      const acc = await seedAccount();
      const food = await seedCategory();
      await add(acc.id, food.id, 1000, "2027-02-28");
      await add(acc.id, food.id, 400, "2027-03-31");

      const result = await service.dailySpending(USER_A, new Date("2027-03-31T15:00:00Z"));

      expect(result.currentDaily).toHaveLength(31);
      expect(result.currentDaily[30]).toBe(400);
      expect(result.previousDaily).toHaveLength(28);
      expect(result.previousDaily[27]).toBe(1000);
    });

    it("is all zeros for a user without data", async () => {
      const result = await service.dailySpending(USER_A, NOW);

      expect(result.currentDaily).toEqual(Array.from({ length: 15 }, () => 0));
      expect(result.previousDaily).toEqual(Array.from({ length: 15 }, () => 0));
    });
  });
});
