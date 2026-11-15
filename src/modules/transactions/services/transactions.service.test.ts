import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { accounts, categories } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import type { Database } from "@/db/types";
import { AppError } from "@/lib/errors";

import type { TransactionInput } from "../schemas/transaction.schema";
import { createTransactionsService } from "./transactions.service";

type TestDb = Awaited<ReturnType<typeof createTestDb>>;

const USER_A = "user_a";
const USER_B = "user_b";

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

describe("transactions service", () => {
  let t: TestDb;
  let service: ReturnType<typeof createTransactionsService>;

  beforeAll(async () => {
    t = await createTestDb();
    service = createTransactionsService(t.db as unknown as Database);
  });

  afterAll(async () => {
    await t.client.close();
  });

  beforeEach(async () => {
    await t.client.exec(
      "TRUNCATE budgets, transactions, categories, accounts RESTART IDENTITY CASCADE",
    );
  });

  async function seedAccount(userId = USER_A, name = "BBVA") {
    const [row] = await t.db
      .insert(accounts)
      .values({ userId, name, type: "bank" })
      .returning();
    return row;
  }

  async function seedCategory(
    userId = USER_A,
    kind: "income" | "expense" = "expense",
    name = "Comida",
  ) {
    const [row] = await t.db.insert(categories).values({ userId, kind, name }).returning();
    return row;
  }

  async function setup(userId = USER_A) {
    const account = await seedAccount(userId);
    const expense = await seedCategory(userId, "expense", "Comida");
    const income = await seedCategory(userId, "income", "Sueldo");
    const expenseInput: TransactionInput = {
      type: "expense",
      accountId: account.id,
      categoryId: expense.id,
      amountCents: 1250,
      date: "2026-11-15",
      note: null,
    };
    const incomeInput: TransactionInput = {
      ...expenseInput,
      type: "income",
      categoryId: income.id,
      amountCents: 300000,
    };
    return { account, expense, income, expenseInput, incomeInput };
  }

  describe("create", () => {
    it("creates a transaction for the user", async () => {
      const { expenseInput } = await setup();

      const created = await service.create(USER_A, { ...expenseInput, note: " Almuerzo " });

      expect(created).toMatchObject({
        userId: USER_A,
        amountCents: 1250,
        date: "2026-11-15",
        note: "Almuerzo",
      });
    });

    it("rejects an account owned by another user with a field error", async () => {
      const { expenseInput } = await setup();
      const other = await seedAccount(USER_B, "Ajena");

      const error = await expectAppError(
        service.create(USER_A, { ...expenseInput, accountId: other.id }),
        "VALIDATION",
      );
      expect(error.fieldErrors?.accountId).toBeDefined();
    });

    it("rejects a category owned by another user", async () => {
      const { expenseInput } = await setup();
      const other = await seedCategory(USER_B);

      const error = await expectAppError(
        service.create(USER_A, { ...expenseInput, categoryId: other.id }),
        "VALIDATION",
      );
      expect(error.fieldErrors?.categoryId).toBeDefined();
    });

    it("rejects a type that does not match the category kind", async () => {
      const { expenseInput, income } = await setup();

      const error = await expectAppError(
        service.create(USER_A, { ...expenseInput, categoryId: income.id }),
        "VALIDATION",
      );
      expect(error.fieldErrors?.categoryId).toMatch(/no es de gasto/);
    });

    it("rejects an archived account and an archived category", async () => {
      const { expenseInput, account, expense } = await setup();
      await t.client.exec(`UPDATE accounts SET archived_at = now() WHERE id = '${account.id}'`);
      await t.client.exec(`UPDATE categories SET archived_at = now() WHERE id = '${expense.id}'`);

      const error = await expectAppError(service.create(USER_A, expenseInput), "VALIDATION");

      expect(error.fieldErrors?.accountId).toMatch(/archivada/);
      expect(error.fieldErrors?.categoryId).toMatch(/archivada/);
    });

    it("revalidates the input", async () => {
      const { expenseInput } = await setup();

      await expect(service.create(USER_A, { ...expenseInput, amountCents: 0 })).rejects.toThrow();
      await expect(
        service.create(USER_A, { ...expenseInput, date: "2026-02-30" }),
      ).rejects.toThrow();
    });
  });

  describe("update", () => {
    it("updates the fields", async () => {
      const { expenseInput } = await setup();
      const created = await service.create(USER_A, expenseInput);

      const updated = await service.update(USER_A, created.id, {
        ...expenseInput,
        amountCents: 999,
        note: "Cena",
      });

      expect(updated).toMatchObject({ amountCents: 999, note: "Cena" });
    });

    it("can switch the type together with a matching category", async () => {
      const { expenseInput, incomeInput } = await setup();
      const created = await service.create(USER_A, expenseInput);

      const updated = await service.update(USER_A, created.id, incomeInput);

      expect(updated.type).toBe("income");
    });

    it("keeps an account and category that were archived after the transaction", async () => {
      const { expenseInput, account, expense } = await setup();
      const created = await service.create(USER_A, expenseInput);
      await t.client.exec(`UPDATE accounts SET archived_at = now() WHERE id = '${account.id}'`);
      await t.client.exec(`UPDATE categories SET archived_at = now() WHERE id = '${expense.id}'`);

      await expect(
        service.update(USER_A, created.id, { ...expenseInput, amountCents: 2000 }),
      ).resolves.toMatchObject({ amountCents: 2000 });
    });

    it("rejects moving to an archived account", async () => {
      const { expenseInput } = await setup();
      const created = await service.create(USER_A, expenseInput);
      const archived = await seedAccount(USER_A, "Vieja");
      await t.client.exec(`UPDATE accounts SET archived_at = now() WHERE id = '${archived.id}'`);

      await expectAppError(
        service.update(USER_A, created.id, { ...expenseInput, accountId: archived.id }),
        "VALIDATION",
      );
    });
  });

  describe("isolation between users", () => {
    it("returns NOT_FOUND when updating or deleting another user's transaction", async () => {
      const { expenseInput } = await setup();
      const mine = await service.create(USER_A, expenseInput);
      const b = await setup(USER_B);

      await expectAppError(service.update(USER_B, mine.id, b.expenseInput), "NOT_FOUND");
      await expectAppError(service.remove(USER_B, mine.id), "NOT_FOUND");
      expect((await service.list(USER_A)).total).toBe(1);
    });

    it("never lists another user's transactions", async () => {
      const a = await setup(USER_A);
      const b = await setup(USER_B);
      await service.create(USER_A, a.expenseInput);
      await service.create(USER_B, b.expenseInput);

      const page = await service.list(USER_A);

      expect(page.total).toBe(1);
      expect(page.items).toHaveLength(1);
    });
  });

  describe("remove", () => {
    it("deletes the transaction", async () => {
      const { expenseInput } = await setup();
      const created = await service.create(USER_A, expenseInput);

      await service.remove(USER_A, created.id);

      expect((await service.list(USER_A)).total).toBe(0);
    });
  });

  describe("list", () => {
    async function seedMany() {
      const { account, expense, income, expenseInput, incomeInput } = await setup();
      const other = await seedAccount(USER_A, "Yape");
      const rows: TransactionInput[] = [
        { ...expenseInput, date: "2026-11-01", amountCents: 1000 },
        { ...expenseInput, date: "2026-11-10", amountCents: 2000, accountId: other.id },
        { ...incomeInput, date: "2026-11-05", amountCents: 500000 },
        { ...expenseInput, date: "2026-10-20", amountCents: 3000 },
      ];
      for (const row of rows) await service.create(USER_A, row);
      return { account, other, expense, income };
    }

    it("orders by date descending and joins account and category names", async () => {
      await seedMany();

      const page = await service.list(USER_A);

      expect(page.items.map((i) => i.date)).toEqual([
        "2026-11-10",
        "2026-11-05",
        "2026-11-01",
        "2026-10-20",
      ]);
      expect(page.items[0]).toMatchObject({ accountName: "Yape", categoryName: "Comida" });
    });

    it("orders same-day items by creation, newest first", async () => {
      const { expenseInput } = await setup();
      const first = await service.create(USER_A, { ...expenseInput, amountCents: 100 });
      const second = await service.create(USER_A, { ...expenseInput, amountCents: 200 });

      const page = await service.list(USER_A);

      expect(page.items.map((i) => i.id)).toEqual([second.id, first.id]);
    });

    it("filters by date range (inclusive), type, account and category", async () => {
      const { account, other, expense } = await seedMany();

      expect(
        (await service.list(USER_A, { from: "2026-11-01", to: "2026-11-10" })).total,
      ).toBe(3);
      expect((await service.list(USER_A, { type: "income" })).total).toBe(1);
      expect((await service.list(USER_A, { accountId: other.id })).total).toBe(1);
      expect((await service.list(USER_A, { accountId: account.id })).total).toBe(3);
      expect((await service.list(USER_A, { categoryId: expense.id })).total).toBe(3);
      expect(
        (
          await service.list(USER_A, {
            from: "2026-11-01",
            type: "expense",
            accountId: account.id,
          })
        ).total,
      ).toBe(1);
    });

    it("computes totals over the whole filtered set, not just the page", async () => {
      await seedMany();

      const page = await service.list(USER_A, { pageSize: 1 });

      expect(page.items).toHaveLength(1);
      expect(page.total).toBe(4);
      expect(page.totals).toEqual({ incomeCents: 500000, expenseCents: 6000 });
    });

    it("paginates and returns an empty page when out of range", async () => {
      await seedMany();

      const second = await service.list(USER_A, { pageSize: 3, page: 2 });
      const far = await service.list(USER_A, { pageSize: 3, page: 9 });

      expect(second.items).toHaveLength(1);
      expect(far.items).toHaveLength(0);
      expect(far.total).toBe(4);
      expect(far.page).toBe(9);
    });

    it("returns zero totals when nothing matches", async () => {
      const page = await service.list(USER_A);

      expect(page).toMatchObject({
        items: [],
        total: 0,
        totals: { incomeCents: 0, expenseCents: 0 },
      });
    });

    it("rejects an invalid range", async () => {
      await expect(
        service.list(USER_A, { from: "2026-11-20", to: "2026-11-10" }),
      ).rejects.toThrow();
    });
  });

  describe("balance adjustments", () => {
    async function seedAdjustment(
      userId = USER_A,
      kind: "income" | "expense" = "income",
    ) {
      const [row] = await t.db
        .insert(categories)
        .values({
          userId,
          name: "Ajuste de saldo",
          kind,
          icon: "tag",
          systemKey: kind === "income" ? "adjustment_income" : "adjustment_expense",
        })
        .returning();
      return row;
    }

    async function insertAdjustment(
      accountId: string,
      category: { id: string },
      type: "income" | "expense",
      cents: number,
      userId = USER_A,
    ) {
      const [row] = await t.client.query<{ id: string }>(
        `INSERT INTO transactions (user_id, account_id, category_id, type, amount_cents, date)
         VALUES ($1, $2, $3, $4, $5, '2026-11-10') RETURNING id`,
        [userId, accountId, category.id, type, cents],
      ).then((r) => r.rows);
      return row.id;
    }

    it("rejects creating a transaction with a system category", async () => {
      const { account, expenseInput } = await setup();
      const system = await seedAdjustment(USER_A, "expense");

      const error = await expectAppError(
        service.create(USER_A, { ...expenseInput, accountId: account.id, categoryId: system.id }),
        "VALIDATION",
      );

      expect(error.fieldErrors?.categoryId).toBeDefined();
    });

    it("excludes system categories from frequent categories", async () => {
      await setup();
      await seedAdjustment(USER_A, "expense");

      const result = await service.frequentCategories(USER_A, "expense", 6, new Date("2026-11-15T15:00:00Z"));

      expect(result.map((r) => r.name)).toEqual(["Comida"]);
    });

    it("lists adjustments marked as such but leaves them out of the totals", async () => {
      const { account, expenseInput, incomeInput } = await setup();
      await service.create(USER_A, { ...expenseInput, amountCents: 1000 });
      await service.create(USER_A, { ...incomeInput, amountCents: 5000 });
      const incomeAdj = await seedAdjustment(USER_A, "income");
      const expenseAdj = await seedAdjustment(USER_A, "expense");
      await insertAdjustment(account.id, incomeAdj, "income", 7000);
      await insertAdjustment(account.id, expenseAdj, "expense", 3000);

      const page = await service.list(USER_A);

      expect(page.total).toBe(4);
      expect(page.items.filter((i) => i.isAdjustment)).toHaveLength(2);
      expect(page.items.filter((i) => !i.isAdjustment)).toHaveLength(2);
      expect(page.totals).toEqual({ incomeCents: 5000, expenseCents: 1000 });
    });

    it("keeps the totals of a type filter free of adjustments too", async () => {
      const { account, expenseInput } = await setup();
      await service.create(USER_A, { ...expenseInput, amountCents: 1000 });
      const expenseAdj = await seedAdjustment(USER_A, "expense");
      await insertAdjustment(account.id, expenseAdj, "expense", 9000);

      const page = await service.list(USER_A, { type: "expense" });

      expect(page.total).toBe(2);
      expect(page.totals.expenseCents).toBe(1000);
    });

    it("refuses to edit an adjustment and allows deleting it", async () => {
      const { account, expenseInput } = await setup();
      const system = await seedAdjustment(USER_A, "expense");
      const id = await insertAdjustment(account.id, system, "expense", 2500);

      await expectAppError(service.update(USER_A, id, expenseInput), "VALIDATION");

      await service.remove(USER_A, id);
      expect((await service.list(USER_A)).total).toBe(0);
    });
  });

  describe("frequentCategories", () => {
    const NOW = new Date("2026-11-15T15:00:00Z");

    async function useCategory(
      accountId: string,
      category: { id: string },
      times: number,
      date = "2026-11-10",
      userId = USER_A,
      type: "income" | "expense" = "expense",
    ) {
      for (let i = 0; i < times; i++) {
        await t.client.query(
          `INSERT INTO transactions (user_id, account_id, category_id, type, amount_cents, date)
           VALUES ($1, $2, $3, $4, 100, $5)`,
          [userId, accountId, category.id, type, date],
        );
      }
    }

    it("orders by usage and fills with unused categories by name", async () => {
      const { account } = await setup();
      await seedCategory(USER_A, "expense", "Alfa");
      const b = await seedCategory(USER_A, "expense", "Beta");
      const c = await seedCategory(USER_A, "expense", "Gamma");
      await useCategory(account.id, c, 3);
      await useCategory(account.id, b, 1);

      const result = await service.frequentCategories(USER_A, "expense", 6, NOW);

      // "Comida" (from setup) and "Alfa" are unused: they follow by name.
      expect(result.map((r) => r.name)).toEqual(["Gamma", "Beta", "Alfa", "Comida"]);
      expect(result.map((r) => r.uses)).toEqual([3, 1, 0, 0]);
    });

    it("only returns categories of the requested type", async () => {
      await setup();

      const expense = await service.frequentCategories(USER_A, "expense", 6, NOW);
      const income = await service.frequentCategories(USER_A, "income", 6, NOW);

      expect(expense.map((r) => r.name)).toEqual(["Comida"]);
      expect(income.map((r) => r.name)).toEqual(["Sueldo"]);
    });

    it("excludes archived categories", async () => {
      const { expense } = await setup();
      await t.client.exec(`UPDATE categories SET archived_at = now() WHERE id = '${expense.id}'`);

      expect(await service.frequentCategories(USER_A, "expense", 6, NOW)).toEqual([]);
    });

    it("ignores transactions older than 90 days but keeps the category", async () => {
      const { account, expense } = await setup();
      const other = await seedCategory(USER_A, "expense", "Otra");
      // 2026-08-16 is 91 days before 2026-11-15; 2026-08-17 is exactly 90.
      await useCategory(account.id, expense, 5, "2026-08-16");
      await useCategory(account.id, other, 1, "2026-08-17");

      const result = await service.frequentCategories(USER_A, "expense", 6, NOW);

      expect(result.map((r) => r.name)).toEqual(["Otra", "Comida"]);
      expect(result.map((r) => r.uses)).toEqual([1, 0]);
    });

    it("never counts another user transactions or lists their categories", async () => {
      const a = await setup(USER_A);
      const b = await setup(USER_B);
      await useCategory(b.account.id, b.expense, 9, "2026-11-10", USER_B);

      const result = await service.frequentCategories(USER_A, "expense", 6, NOW);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: a.expense.id, uses: 0 });
    });

    it("returns at most the limit", async () => {
      await setup();
      for (let i = 0; i < 8; i++) await seedCategory(USER_A, "expense", `Cat ${i}`);

      expect(await service.frequentCategories(USER_A, "expense", 6, NOW)).toHaveLength(6);
      expect(await service.frequentCategories(USER_A, "expense", 3, NOW)).toHaveLength(3);
    });
  });
});
