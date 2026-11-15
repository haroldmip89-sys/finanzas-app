import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { accounts, categories, transactions, transfers } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import type { Database } from "@/db/types";
import { AppError } from "@/lib/errors";

import { createBudgetsService } from "./budgets.service";

type TestDb = Awaited<ReturnType<typeof createTestDb>>;

const USER_A = "user_a";
const USER_B = "user_b";
const MONTH = "2026-11";
const PREV = "2026-10";

async function expectAppError(promise: Promise<unknown>, code: string) {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe(code);
    return error as AppError;
  }
  throw new Error(`Expected AppError ${code}`);
}

describe("budgets service", () => {
  let t: TestDb;
  let service: ReturnType<typeof createBudgetsService>;

  beforeAll(async () => {
    t = await createTestDb();
    service = createBudgetsService(t.db as unknown as Database);
  });

  afterAll(async () => {
    await t.client.close();
  });

  beforeEach(async () => {
    await t.client.exec(
      "TRUNCATE budgets, transactions, transfers, categories, accounts RESTART IDENTITY CASCADE",
    );
  });

  async function seedAccount(userId = USER_A, name = "BBVA", type: "bank" | "card" = "bank") {
    const [row] = await t.db.insert(accounts).values({ userId, name, type }).returning();
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

  async function spend(
    accountId: string,
    categoryId: string,
    cents: number,
    date: string,
    type: "income" | "expense" = "expense",
    userId = USER_A,
  ) {
    await t.db.insert(transactions).values({
      userId,
      accountId,
      categoryId,
      type,
      amountCents: cents,
      date,
    });
  }

  describe("create", () => {
    it("creates a budget for the first day of the month", async () => {
      const food = await seedCategory();

      const created = await service.create(USER_A, { categoryId: food.id, month: MONTH, amountCents: 30000 });

      expect(created).toMatchObject({ userId: USER_A, month: "2026-11-01", amountCents: 30000, categoryKind: "expense" });
    });

    it("rejects a second budget for the same category and month with a field error", async () => {
      const food = await seedCategory();
      await service.create(USER_A, { categoryId: food.id, month: MONTH, amountCents: 30000 });

      const error = await expectAppError(
        service.create(USER_A, { categoryId: food.id, month: MONTH, amountCents: 1000 }),
        "CONFLICT",
      );

      expect(error.fieldErrors?.categoryId).toBeDefined();
    });

    it("allows the same category in another month", async () => {
      const food = await seedCategory();
      await service.create(USER_A, { categoryId: food.id, month: MONTH, amountCents: 30000 });

      await expect(
        service.create(USER_A, { categoryId: food.id, month: "2026-12", amountCents: 30000 }),
      ).resolves.toBeDefined();
    });

    it("rejects income, archived, foreign and system categories", async () => {
      const income = await seedCategory(USER_A, "Sueldo", "income");
      const archived = await seedCategory(USER_A, "Vieja");
      await t.client.exec(`UPDATE categories SET archived_at = now() WHERE id = '${archived.id}'`);
      const foreign = await seedCategory(USER_B, "Ajena");
      const system = await seedCategory(USER_A, "Ajuste de saldo", "expense", "adjustment_expense");

      for (const category of [income, archived, foreign, system]) {
        const error = await expectAppError(
          service.create(USER_A, { categoryId: category.id, month: MONTH, amountCents: 1000 }),
          "VALIDATION",
        );
        expect(error.fieldErrors?.categoryId).toBeDefined();
      }
    });

    it("revalidates the input", async () => {
      const food = await seedCategory();

      await expect(service.create(USER_A, { categoryId: food.id, month: MONTH, amountCents: 0 })).rejects.toThrow();
      await expect(service.create(USER_A, { categoryId: food.id, month: "2026-13", amountCents: 100 })).rejects.toThrow();
    });
  });

  describe("update and remove", () => {
    it("updates only the amount", async () => {
      const food = await seedCategory();
      const budget = await service.create(USER_A, { categoryId: food.id, month: MONTH, amountCents: 30000 });

      const updated = await service.update(USER_A, budget.id, { amountCents: 45000 });

      expect(updated).toMatchObject({ amountCents: 45000, categoryId: food.id, month: "2026-11-01" });
    });

    it("deletes a budget", async () => {
      const food = await seedCategory();
      const budget = await service.create(USER_A, { categoryId: food.id, month: MONTH, amountCents: 30000 });

      await service.remove(USER_A, budget.id);

      expect((await service.list(USER_A, MONTH)).items).toHaveLength(0);
    });

    it("returns NOT_FOUND when touching another user's budget", async () => {
      const food = await seedCategory();
      const mine = await service.create(USER_A, { categoryId: food.id, month: MONTH, amountCents: 30000 });

      await expectAppError(service.update(USER_B, mine.id, { amountCents: 1 }), "NOT_FOUND");
      await expectAppError(service.remove(USER_B, mine.id), "NOT_FOUND");
      expect((await service.list(USER_A, MONTH)).items[0].amountCents).toBe(30000);
    });
  });

  describe("list: spent", () => {
    it("sums only the expenses of the category in the month", async () => {
      const account = await seedAccount();
      const food = await seedCategory();
      const salary = await seedCategory(USER_A, "Sueldo", "income");
      await service.create(USER_A, { categoryId: food.id, month: MONTH, amountCents: 30000 });
      await spend(account.id, food.id, 5000, "2026-11-03");
      await spend(account.id, food.id, 2500, "2026-11-20");
      await spend(account.id, salary.id, 999999, "2026-11-05", "income");

      const { items } = await service.list(USER_A, MONTH);

      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({ categoryName: "Comida", amountCents: 30000, spentCents: 7500 });
    });

    it("respects the first and last day of the month and nothing outside", async () => {
      const account = await seedAccount();
      const food = await seedCategory();
      await service.create(USER_A, { categoryId: food.id, month: MONTH, amountCents: 30000 });
      await spend(account.id, food.id, 1, "2026-11-01");
      await spend(account.id, food.id, 2, "2026-11-30");
      await spend(account.id, food.id, 1000, "2026-10-31");
      await spend(account.id, food.id, 2000, "2026-12-01");

      const { items } = await service.list(USER_A, MONTH);

      expect(items[0].spentCents).toBe(3);
    });

    it("counts spending in every account, including cards", async () => {
      const bank = await seedAccount(USER_A, "BBVA", "bank");
      const card = await seedAccount(USER_A, "Visa", "card");
      const food = await seedCategory();
      await service.create(USER_A, { categoryId: food.id, month: MONTH, amountCents: 30000 });
      await spend(bank.id, food.id, 1000, "2026-11-05");
      await spend(card.id, food.id, 4000, "2026-11-06");

      expect((await service.list(USER_A, MONTH)).items[0].spentCents).toBe(5000);
    });

    it("does not count transfers or balance adjustments", async () => {
      const a = await seedAccount(USER_A, "A");
      const b = await seedAccount(USER_A, "B");
      const food = await seedCategory();
      const adjustment = await seedCategory(USER_A, "Ajuste de saldo", "expense", "adjustment_expense");
      await service.create(USER_A, { categoryId: food.id, month: MONTH, amountCents: 30000 });
      await t.db.insert(transfers).values({
        userId: USER_A, fromAccountId: a.id, toAccountId: b.id, amountCents: 99999, date: "2026-11-10",
      });
      await spend(a.id, adjustment.id, 8000, "2026-11-10");
      await spend(a.id, food.id, 700, "2026-11-11");

      const overview = await service.list(USER_A, MONTH);

      expect(overview.items[0].spentCents).toBe(700);
      expect(overview.unbudgeted).toEqual([]);
    });

    it("is zero when the category has no spending", async () => {
      const food = await seedCategory();
      await service.create(USER_A, { categoryId: food.id, month: MONTH, amountCents: 30000 });

      expect((await service.list(USER_A, MONTH)).items[0].spentCents).toBe(0);
    });

    it("does not mix months or users", async () => {
      const account = await seedAccount();
      const food = await seedCategory();
      await service.create(USER_A, { categoryId: food.id, month: MONTH, amountCents: 30000 });
      await service.create(USER_A, { categoryId: food.id, month: PREV, amountCents: 10000 });
      await spend(account.id, food.id, 4000, "2026-10-15");
      const otherAccount = await seedAccount(USER_B, "B");
      const otherFood = await seedCategory(USER_B, "Comida");
      await spend(otherAccount.id, otherFood.id, 99999, "2026-11-05", "expense", USER_B);

      const november = await service.list(USER_A, MONTH);
      const october = await service.list(USER_A, PREV);

      expect(november.items[0].spentCents).toBe(0);
      expect(october.items[0].spentCents).toBe(4000);
      expect((await service.list(USER_B, MONTH)).items).toHaveLength(0);
    });
  });

  describe("list: order, totals and unbudgeted", () => {
    it("orders budgets from most to least consumed, then by name", async () => {
      const account = await seedAccount();
      const food = await seedCategory(USER_A, "Comida");
      const transport = await seedCategory(USER_A, "Transporte");
      const fun = await seedCategory(USER_A, "Ocio");
      for (const c of [food, transport, fun]) {
        await service.create(USER_A, { categoryId: c.id, month: MONTH, amountCents: 10000 });
      }
      await spend(account.id, transport.id, 9000, "2026-11-05"); // 90 %
      await spend(account.id, food.id, 3000, "2026-11-05"); // 30 %
      // "Ocio" 0 %

      const { items } = await service.list(USER_A, MONTH);

      expect(items.map((i) => i.categoryName)).toEqual(["Transporte", "Comida", "Ocio"]);
    });

    it("computes totals, with a negative remainder when over budget", async () => {
      const account = await seedAccount();
      const food = await seedCategory(USER_A, "Comida");
      const fun = await seedCategory(USER_A, "Ocio");
      await service.create(USER_A, { categoryId: food.id, month: MONTH, amountCents: 20000 });
      await service.create(USER_A, { categoryId: fun.id, month: MONTH, amountCents: 5000 });
      await spend(account.id, food.id, 25000, "2026-11-05");
      await spend(account.id, fun.id, 1000, "2026-11-06");

      const { totals } = await service.list(USER_A, MONTH);

      expect(totals).toEqual({ budgetedCents: 25000, spentCents: 26000, remainingCents: -1000 });
    });

    it("has zero totals when there are no budgets", async () => {
      expect((await service.list(USER_A, MONTH)).totals).toEqual({
        budgetedCents: 0,
        spentCents: 0,
        remainingCents: 0,
      });
    });

    it("groups spending of categories without a budget, from most to least", async () => {
      const account = await seedAccount();
      const food = await seedCategory(USER_A, "Comida");
      const fun = await seedCategory(USER_A, "Ocio");
      const transport = await seedCategory(USER_A, "Transporte");
      await service.create(USER_A, { categoryId: food.id, month: MONTH, amountCents: 30000 });
      await spend(account.id, food.id, 1000, "2026-11-05");
      await spend(account.id, fun.id, 2000, "2026-11-05");
      await spend(account.id, fun.id, 1500, "2026-11-20");
      await spend(account.id, transport.id, 9000, "2026-11-06");
      await spend(account.id, transport.id, 700, "2026-10-06"); // other month

      const { unbudgeted } = await service.list(USER_A, MONTH);

      expect(unbudgeted.map((u) => [u.categoryName, u.spentCents])).toEqual([
        ["Transporte", 9000],
        ["Ocio", 3500],
      ]);
    });

    it("leaves out income and system categories from the unbudgeted list", async () => {
      const account = await seedAccount();
      const salary = await seedCategory(USER_A, "Sueldo", "income");
      const adjustment = await seedCategory(USER_A, "Ajuste de saldo", "expense", "adjustment_expense");
      await spend(account.id, salary.id, 5000, "2026-11-05", "income");
      await spend(account.id, adjustment.id, 3000, "2026-11-05");

      expect((await service.list(USER_A, MONTH)).unbudgeted).toEqual([]);
    });

    it("flags whether the previous month has budgets to copy", async () => {
      const food = await seedCategory();
      expect((await service.list(USER_A, MONTH)).previousMonthHasBudgets).toBe(false);

      await service.create(USER_A, { categoryId: food.id, month: PREV, amountCents: 10000 });

      expect((await service.list(USER_A, MONTH)).previousMonthHasBudgets).toBe(true);
      expect((await service.list(USER_B, MONTH)).previousMonthHasBudgets).toBe(false);
    });

    it("rejects an invalid month", async () => {
      await expect(service.list(USER_A, "2026-13")).rejects.toThrow();
    });
  });

  describe("copyFromPreviousMonth", () => {
    it("copies the previous month's budgets with their amounts", async () => {
      const food = await seedCategory(USER_A, "Comida");
      const fun = await seedCategory(USER_A, "Ocio");
      await service.create(USER_A, { categoryId: food.id, month: PREV, amountCents: 30000 });
      await service.create(USER_A, { categoryId: fun.id, month: PREV, amountCents: 8000 });

      const result = await service.copyFromPreviousMonth(USER_A, MONTH);

      expect(result).toEqual({ created: 2 });
      const { items } = await service.list(USER_A, MONTH);
      expect(items.map((i) => [i.categoryName, i.amountCents]).sort()).toEqual([
        ["Comida", 30000],
        ["Ocio", 8000],
      ]);
    });

    it("does not overwrite budgets that already exist", async () => {
      const food = await seedCategory(USER_A, "Comida");
      const fun = await seedCategory(USER_A, "Ocio");
      await service.create(USER_A, { categoryId: food.id, month: PREV, amountCents: 30000 });
      await service.create(USER_A, { categoryId: fun.id, month: PREV, amountCents: 8000 });
      await service.create(USER_A, { categoryId: food.id, month: MONTH, amountCents: 99999 });

      const result = await service.copyFromPreviousMonth(USER_A, MONTH);

      expect(result).toEqual({ created: 1 });
      const { items } = await service.list(USER_A, MONTH);
      expect(items.find((i) => i.categoryName === "Comida")?.amountCents).toBe(99999);
      expect(items.find((i) => i.categoryName === "Ocio")?.amountCents).toBe(8000);
    });

    it("is safe to repeat and to run concurrently", async () => {
      const food = await seedCategory();
      await service.create(USER_A, { categoryId: food.id, month: PREV, amountCents: 30000 });

      await Promise.all([
        service.copyFromPreviousMonth(USER_A, MONTH),
        service.copyFromPreviousMonth(USER_A, MONTH),
      ]);
      await service.copyFromPreviousMonth(USER_A, MONTH);

      expect((await service.list(USER_A, MONTH)).items).toHaveLength(1);
    });

    it("skips archived categories", async () => {
      const food = await seedCategory(USER_A, "Comida");
      const old = await seedCategory(USER_A, "Vieja");
      await service.create(USER_A, { categoryId: food.id, month: PREV, amountCents: 30000 });
      await service.create(USER_A, { categoryId: old.id, month: PREV, amountCents: 5000 });
      await t.client.exec(`UPDATE categories SET archived_at = now() WHERE id = '${old.id}'`);

      const result = await service.copyFromPreviousMonth(USER_A, MONTH);

      expect(result).toEqual({ created: 1 });
    });

    it("reports an empty previous month instead of failing silently", async () => {
      const error = await expectAppError(service.copyFromPreviousMonth(USER_A, MONTH), "VALIDATION");

      expect(error.message).toMatch(/mes anterior/);
    });

    it("never copies another user's budgets", async () => {
      const theirs = await seedCategory(USER_B, "Comida");
      await service.create(USER_B, { categoryId: theirs.id, month: PREV, amountCents: 30000 });

      await expectAppError(service.copyFromPreviousMonth(USER_A, MONTH), "VALIDATION");
      expect((await service.list(USER_B, MONTH)).items).toHaveLength(0);
    });

    it("crosses the year boundary (January copies December)", async () => {
      const food = await seedCategory();
      await service.create(USER_A, { categoryId: food.id, month: "2026-12", amountCents: 12000 });

      const result = await service.copyFromPreviousMonth(USER_A, "2027-01");

      expect(result).toEqual({ created: 1 });
      expect((await service.list(USER_A, "2027-01")).items[0].amountCents).toBe(12000);
    });
  });
});
