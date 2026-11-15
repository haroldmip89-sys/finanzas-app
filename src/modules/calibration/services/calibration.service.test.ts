import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { accounts, categories, transactions, transfers } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import type { Database } from "@/db/types";
import { AppError } from "@/lib/errors";
import { getAccountBalanceCents } from "@/modules/accounts/services/account-balance";

import { createCalibrationService } from "./calibration.service";

type TestDb = Awaited<ReturnType<typeof createTestDb>>;

const USER_A = "user_a";
const USER_B = "user_b";
// 03:00 UTC on Nov 16 is still Nov 15 in Lima.
const NOW = new Date("2026-11-16T03:00:00Z");

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

describe("calibration service", () => {
  let t: TestDb;
  let db: Database;
  let service: ReturnType<typeof createCalibrationService>;

  beforeAll(async () => {
    t = await createTestDb();
    db = t.db as unknown as Database;
    service = createCalibrationService(db);
  });

  afterAll(async () => {
    await t.client.close();
  });

  beforeEach(async () => {
    await t.client.exec(
      "TRUNCATE budgets, transactions, transfers, categories, accounts RESTART IDENTITY CASCADE",
    );
  });

  async function seedAccount(userId = USER_A, name = "BBVA", initialBalanceCents = 100000) {
    const [row] = await t.db
      .insert(accounts)
      .values({ userId, name, type: "bank", initialBalanceCents })
      .returning();
    return row;
  }

  async function balance(userId: string, accountId: string) {
    return getAccountBalanceCents(db, userId, accountId);
  }

  async function adjustments(userId = USER_A) {
    return t.db
      .select({
        id: transactions.id,
        type: transactions.type,
        amountCents: transactions.amountCents,
        date: transactions.date,
        note: transactions.note,
        systemKey: categories.systemKey,
      })
      .from(transactions)
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .where(eq(transactions.userId, userId));
  }

  describe("difference", () => {
    it("creates an income adjustment when the real balance is higher", async () => {
      const account = await seedAccount(USER_A, "BBVA", 100000);

      const result = await service.calibrate(USER_A, { accountId: account.id, realBalanceCents: 102000 }, NOW);

      expect(result).toMatchObject({
        accountName: "BBVA",
        previousBalanceCents: 100000,
        newBalanceCents: 102000,
        differenceCents: 2000,
      });
      const [adj] = await adjustments();
      expect(adj).toMatchObject({ type: "income", amountCents: 2000, systemKey: "adjustment_income" });
      expect(await balance(USER_A, account.id)).toBe(102000);
    });

    it("creates an expense adjustment when the real balance is lower", async () => {
      const account = await seedAccount(USER_A, "BBVA", 100000);

      const result = await service.calibrate(USER_A, { accountId: account.id, realBalanceCents: 97500 }, NOW);

      expect(result.differenceCents).toBe(-2500);
      const [adj] = await adjustments();
      expect(adj).toMatchObject({ type: "expense", amountCents: 2500, systemKey: "adjustment_expense" });
      expect(await balance(USER_A, account.id)).toBe(97500);
    });

    it("leaves the balance exactly at the real one with prior transactions and transfers", async () => {
      const a = await seedAccount(USER_A, "A", 50000);
      const b = await seedAccount(USER_A, "B", 0);
      const [cat] = await t.db
        .insert(categories)
        .values({ userId: USER_A, kind: "expense", name: "Comida" })
        .returning();
      await t.db.insert(transactions).values({
        userId: USER_A, accountId: a.id, categoryId: cat.id, type: "expense", amountCents: 1234, date: "2026-11-01",
      });
      await t.db.insert(transfers).values({
        userId: USER_A, fromAccountId: a.id, toAccountId: b.id, amountCents: 10000, date: "2026-11-02",
      });

      await service.calibrate(USER_A, { accountId: a.id, realBalanceCents: 30000 }, NOW);

      expect(await balance(USER_A, a.id)).toBe(30000);
      expect(await balance(USER_A, b.id)).toBe(10000);
    });

    it("works from and to negative balances (credit card)", async () => {
      const card = await seedAccount(USER_A, "Visa", -20000);

      await service.calibrate(USER_A, { accountId: card.id, realBalanceCents: -35000 }, NOW);
      expect(await balance(USER_A, card.id)).toBe(-35000);

      await service.calibrate(USER_A, { accountId: card.id, realBalanceCents: 5000 }, NOW);
      expect(await balance(USER_A, card.id)).toBe(5000);
    });

    it("dates the adjustment with today in Lima and writes a note with both balances", async () => {
      const account = await seedAccount(USER_A, "BBVA", 100000);

      await service.calibrate(USER_A, { accountId: account.id, realBalanceCents: 102000 }, NOW);

      const [adj] = await adjustments();
      expect(adj.date).toBe("2026-11-15");
      expect(adj.note?.replace(/ /g, " ")).toBe("Calibración de saldo: de S/ 1,000.00 a S/ 1,020.00");
    });
  });

  describe("no difference and retries", () => {
    it("creates nothing when the balance already matches", async () => {
      const account = await seedAccount(USER_A, "BBVA", 100000);

      const error = await expectAppError(
        service.calibrate(USER_A, { accountId: account.id, realBalanceCents: 100000 }, NOW),
        "VALIDATION",
      );

      expect(error.message).toMatch(/ya coincide/);
      expect(error.fieldErrors?.realBalance).toBeDefined();
      expect(await adjustments()).toHaveLength(0);
    });

    it("does not create a second adjustment when the same request is sent twice", async () => {
      const account = await seedAccount(USER_A, "BBVA", 100000);
      const input = { accountId: account.id, realBalanceCents: 102000 };

      await service.calibrate(USER_A, input, NOW);
      await expectAppError(service.calibrate(USER_A, input, NOW), "VALIDATION");

      expect(await adjustments()).toHaveLength(1);
      expect(await balance(USER_A, account.id)).toBe(102000);
    });

    it("does not duplicate under concurrent identical requests", async () => {
      const account = await seedAccount(USER_A, "BBVA", 100000);
      const input = { accountId: account.id, realBalanceCents: 90000 };

      const results = await Promise.allSettled([
        service.calibrate(USER_A, input, NOW),
        service.calibrate(USER_A, input, NOW),
        service.calibrate(USER_A, input, NOW),
      ]);

      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(await adjustments()).toHaveLength(1);
      expect(await balance(USER_A, account.id)).toBe(90000);
    });
  });

  describe("system categories", () => {
    it("creates each system category once and reuses it", async () => {
      const account = await seedAccount(USER_A, "BBVA", 100000);

      await service.calibrate(USER_A, { accountId: account.id, realBalanceCents: 110000 }, NOW);
      await service.calibrate(USER_A, { accountId: account.id, realBalanceCents: 120000 }, NOW);
      await service.calibrate(USER_A, { accountId: account.id, realBalanceCents: 90000 }, NOW);
      await service.calibrate(USER_A, { accountId: account.id, realBalanceCents: 80000 }, NOW);

      const system = await t.db.select().from(categories);
      expect(system.map((c) => c.systemKey).sort()).toEqual(["adjustment_expense", "adjustment_income"]);
    });

    it("keeps system categories separate per user", async () => {
      const a = await seedAccount(USER_A, "A", 0);
      const b = await seedAccount(USER_B, "B", 0);

      await service.calibrate(USER_A, { accountId: a.id, realBalanceCents: 100 }, NOW);
      await service.calibrate(USER_B, { accountId: b.id, realBalanceCents: 100 }, NOW);

      const rows = await t.db.select().from(categories);
      expect(rows.map((r) => r.userId).sort()).toEqual([USER_A, USER_B]);
    });

    it("falls back to another name when the user already has a category with that name", async () => {
      const account = await seedAccount(USER_A, "BBVA", 0);
      await t.db.insert(categories).values({ userId: USER_A, kind: "income", name: "Ajuste de saldo" });

      await service.calibrate(USER_A, { accountId: account.id, realBalanceCents: 5000 }, NOW);

      const [adj] = await adjustments();
      expect(adj.systemKey).toBe("adjustment_income");
      expect(await balance(USER_A, account.id)).toBe(5000);
    });
  });

  describe("access", () => {
    it("rejects an archived account", async () => {
      const account = await seedAccount(USER_A, "Vieja", 0);
      await t.client.exec(`UPDATE accounts SET archived_at = now() WHERE id = '${account.id}'`);

      const error = await expectAppError(
        service.calibrate(USER_A, { accountId: account.id, realBalanceCents: 100 }, NOW),
        "VALIDATION",
      );

      expect(error.fieldErrors?.accountId).toMatch(/archivada/);
      expect(await adjustments()).toHaveLength(0);
    });

    it("returns NOT_FOUND for another user's account and for unknown ids", async () => {
      const foreign = await seedAccount(USER_B, "Ajena", 0);

      await expectAppError(
        service.calibrate(USER_A, { accountId: foreign.id, realBalanceCents: 100 }, NOW),
        "NOT_FOUND",
      );
      await expectAppError(
        service.calibrate(USER_A, { accountId: "11111111-1111-4111-8111-111111111111", realBalanceCents: 100 }, NOW),
        "NOT_FOUND",
      );
      expect(await balance(USER_B, foreign.id)).toBe(0);
      expect(await adjustments(USER_B)).toHaveLength(0);
    });

    it("revalidates the input", async () => {
      const account = await seedAccount(USER_A, "BBVA", 0);

      await expect(
        service.calibrate(USER_A, { accountId: account.id, realBalanceCents: 1.5 }, NOW),
      ).rejects.toThrow();
      await expect(
        service.calibrate(USER_A, { accountId: "no-uuid", realBalanceCents: 10 }, NOW),
      ).rejects.toThrow();
    });
  });
});

