import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createTestDb } from "../test-db";
import { accounts, budgets, categories, transactions } from "./index";

type TestDb = Awaited<ReturnType<typeof createTestDb>>;

const USER_A = "user_a";
const USER_B = "user_b";

/** Extracts the Postgres error (drizzle wraps it in `cause`). */
function pgError(error: unknown): { constraint?: string; code?: string } {
  const e = error as { cause?: unknown };
  return (e.cause ?? error) as { constraint?: string; code?: string };
}

async function expectConstraint(promise: Promise<unknown>, name: string) {
  try {
    await promise;
  } catch (error) {
    expect(pgError(error).constraint).toBe(name);
    return;
  }
  throw new Error(`Expected constraint violation: ${name}`);
}

describe("schema constraints", () => {
  let t: TestDb;

  beforeAll(async () => {
    t = await createTestDb();
  });

  afterAll(async () => {
    await t.client.close();
  });

  beforeEach(async () => {
    await t.client.exec(
      "TRUNCATE budgets, transactions, categories, accounts RESTART IDENTITY CASCADE",
    );
  });

  async function seedAccount(userId = USER_A, name = "Efectivo") {
    const [row] = await t.db
      .insert(accounts)
      .values({ userId, name, type: "cash" })
      .returning();
    return row;
  }

  async function seedCategory(
    userId = USER_A,
    kind: "income" | "expense" = "expense",
    name = "Comida",
  ) {
    const [row] = await t.db
      .insert(categories)
      .values({ userId, kind, name })
      .returning();
    return row;
  }

  function validTransaction(accountId: string, categoryId: string) {
    return {
      userId: USER_A,
      accountId,
      categoryId,
      type: "expense" as const,
      amountCents: 1250,
      date: "2026-11-15",
    };
  }

  describe("happy path", () => {
    it("inserts an account, category, transaction and budget", async () => {
      const account = await seedAccount();
      const category = await seedCategory();

      const [tx] = await t.db
        .insert(transactions)
        .values(validTransaction(account.id, category.id))
        .returning();
      const [budget] = await t.db
        .insert(budgets)
        .values({
          userId: USER_A,
          categoryId: category.id,
          month: "2026-11-01",
          amountCents: 50000,
        })
        .returning();

      expect(tx.amountCents).toBe(1250);
      expect(account.initialBalanceCents).toBe(0);
      expect(budget.categoryKind).toBe("expense");
    });
  });

  describe("transactions", () => {
    it("rejects amount <= 0", async () => {
      const account = await seedAccount();
      const category = await seedCategory();

      await expectConstraint(
        t.db.insert(transactions).values({
          ...validTransaction(account.id, category.id),
          amountCents: 0,
        }),
        "transactions_amount_positive",
      );
    });

    it("rejects a note longer than 280 characters", async () => {
      const account = await seedAccount();
      const category = await seedCategory();

      await expectConstraint(
        t.db.insert(transactions).values({
          ...validTransaction(account.id, category.id),
          note: "x".repeat(281),
        }),
        "transactions_note_length",
      );
    });

    it("rejects an account owned by another user", async () => {
      const otherAccount = await seedAccount(USER_B);
      const category = await seedCategory();

      await expectConstraint(
        t.db
          .insert(transactions)
          .values(validTransaction(otherAccount.id, category.id)),
        "transactions_account_owner_fk",
      );
    });

    it("rejects a category owned by another user", async () => {
      const account = await seedAccount();
      const otherCategory = await seedCategory(USER_B);

      await expectConstraint(
        t.db
          .insert(transactions)
          .values(validTransaction(account.id, otherCategory.id)),
        "transactions_category_owner_kind_fk",
      );
    });

    it("rejects a type that differs from the category kind", async () => {
      const account = await seedAccount();
      const incomeCategory = await seedCategory(USER_A, "income", "Sueldo");

      await expectConstraint(
        t.db.insert(transactions).values({
          ...validTransaction(account.id, incomeCategory.id),
          type: "expense",
        }),
        "transactions_category_owner_kind_fk",
      );
    });
  });

  describe("budgets", () => {
    it("rejects an income category", async () => {
      const incomeCategory = await seedCategory(USER_A, "income", "Sueldo");

      await expectConstraint(
        t.db.insert(budgets).values({
          userId: USER_A,
          categoryId: incomeCategory.id,
          month: "2026-11-01",
          amountCents: 1000,
        }),
        "budgets_category_owner_kind_fk",
      );
    });

    it("rejects a category owned by another user", async () => {
      const otherCategory = await seedCategory(USER_B);

      await expectConstraint(
        t.db.insert(budgets).values({
          userId: USER_A,
          categoryId: otherCategory.id,
          month: "2026-11-01",
          amountCents: 1000,
        }),
        "budgets_category_owner_kind_fk",
      );
    });

    it("rejects a month that is not the first day", async () => {
      const category = await seedCategory();

      await expectConstraint(
        t.db.insert(budgets).values({
          userId: USER_A,
          categoryId: category.id,
          month: "2026-11-15",
          amountCents: 1000,
        }),
        "budgets_month_first_day",
      );
    });

    it("rejects amount <= 0", async () => {
      const category = await seedCategory();

      await expectConstraint(
        t.db.insert(budgets).values({
          userId: USER_A,
          categoryId: category.id,
          month: "2026-11-01",
          amountCents: -5,
        }),
        "budgets_amount_positive",
      );
    });

    it("rejects a duplicate (user, category, month)", async () => {
      const category = await seedCategory();
      const row = {
        userId: USER_A,
        categoryId: category.id,
        month: "2026-11-01",
        amountCents: 1000,
      };
      await t.db.insert(budgets).values(row);

      await expectConstraint(
        t.db.insert(budgets).values(row),
        "budgets_user_category_month_unique",
      );
    });
  });

  describe("uniqueness", () => {
    it("rejects a duplicate account name for the same user", async () => {
      await seedAccount(USER_A, "Efectivo");

      await expectConstraint(
        seedAccount(USER_A, "Efectivo"),
        "accounts_user_name_unique",
      );
    });

    it("allows the same account name for different users", async () => {
      await seedAccount(USER_A, "Efectivo");

      await expect(seedAccount(USER_B, "Efectivo")).resolves.toBeDefined();
    });

    it("rejects a duplicate category (user, kind, name)", async () => {
      await seedCategory(USER_A, "expense", "Comida");

      await expectConstraint(
        seedCategory(USER_A, "expense", "Comida"),
        "categories_user_kind_name_unique",
      );
    });

    it("allows the same name with a different kind", async () => {
      await seedCategory(USER_A, "expense", "Otros");

      await expect(
        seedCategory(USER_A, "income", "Otros"),
      ).resolves.toBeDefined();
    });
  });

  describe("ON DELETE RESTRICT", () => {
    it("blocks deleting an account that has transactions", async () => {
      const account = await seedAccount();
      const category = await seedCategory();
      await t.db
        .insert(transactions)
        .values(validTransaction(account.id, category.id));

      await expectConstraint(
        t.db.delete(accounts).where(eq(accounts.id, account.id)),
        "transactions_account_owner_fk",
      );
    });

    it("blocks deleting a category that has transactions", async () => {
      const account = await seedAccount();
      const category = await seedCategory();
      await t.db
        .insert(transactions)
        .values(validTransaction(account.id, category.id));

      await expectConstraint(
        t.db.delete(categories).where(eq(categories.id, category.id)),
        "transactions_category_owner_kind_fk",
      );
    });
  });
});
