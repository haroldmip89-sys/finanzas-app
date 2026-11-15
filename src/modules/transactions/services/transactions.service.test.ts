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
});
