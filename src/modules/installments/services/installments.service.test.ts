import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { accounts, transactions } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import type { Database } from "@/db/types";
import { AppError } from "@/lib/errors";

import { createInstallmentsService } from "./installments.service";

type TestDb = Awaited<ReturnType<typeof createTestDb>>;

const USER_A = "user_a";
const USER_B = "user_b";
const NOW = new Date("2026-11-15T15:00:00Z");

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

describe("installments service", () => {
  let t: TestDb;
  let service: ReturnType<typeof createInstallmentsService>;

  beforeAll(async () => {
    t = await createTestDb();
    service = createInstallmentsService(t.db as unknown as Database);
  });

  afterAll(async () => {
    await t.client.close();
  });

  beforeEach(async () => {
    await t.client.exec("TRUNCATE installment_plans, transactions, accounts RESTART IDENTITY CASCADE");
  });

  async function account(
    userId = USER_A,
    name = "Visa",
    over: Partial<typeof accounts.$inferInsert> = {},
  ) {
    const [row] = await t.db
      .insert(accounts)
      .values({ userId, name, type: "card", ...over })
      .returning();
    return row;
  }

  const plan = (accountId: string, over: Record<string, unknown> = {}) => ({
    accountId,
    name: "Laptop",
    principalCents: 110000,
    installmentCount: 12,
    installmentCents: 10000,
    firstDueMonth: "2026-11",
    ...over,
  });

  it("creates a plan and lists its figures", async () => {
    const card = await account();
    await service.create(USER_A, plan(card.id));

    const { items, dueThisMonthCents, remainingCents } = await service.list(USER_A, NOW);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      name: "Laptop",
      accountName: "Visa",
      firstDueMonth: "2026-11-01",
      paidCount: 0,
      remainingCount: 12,
      interestCents: 10000,
      dueThisMonth: true,
    });
    expect(dueThisMonthCents).toBe(10000);
    expect(remainingCents).toBe(120000);
  });

  it("rejects accounts that are not an active card of the user", async () => {
    const bank = await account(USER_A, "BBVA", { type: "bank" });
    const archived = await account(USER_A, "Vieja", { archivedAt: new Date() });
    const foreign = await account(USER_B, "Ajena");

    for (const a of [bank, archived, foreign]) {
      const error = await expectAppError(service.create(USER_A, plan(a.id)), "VALIDATION");
      expect(error.fieldErrors?.accountId).toBeTruthy();
    }
  });

  it("pays installments one at a time and never past the total", async () => {
    const card = await account();
    const { id } = await service.create(USER_A, plan(card.id, { installmentCount: 2 }));

    await service.payInstallment(USER_A, id);
    await service.payInstallment(USER_A, id);
    await expectAppError(service.payInstallment(USER_A, id), "VALIDATION");

    const { items, dueThisMonthCents } = await service.list(USER_A, NOW);
    expect(items[0]).toMatchObject({ paidCount: 2, finished: true, remainingCents: 0 });
    expect(dueThisMonthCents).toBe(0);
  });

  it("advances the due month as installments are paid", async () => {
    const card = await account();
    const { id } = await service.create(USER_A, plan(card.id));
    await service.payInstallment(USER_A, id);

    const { items, dueThisMonthCents } = await service.list(USER_A, NOW);
    expect(items[0].nextDueMonth).toBe("2026-12");
    expect(items[0].dueThisMonth).toBe(false);
    expect(dueThisMonthCents).toBe(0);
  });

  it("only touches the user's own plans", async () => {
    const card = await account();
    const { id } = await service.create(USER_A, plan(card.id));

    await expectAppError(service.payInstallment(USER_B, id), "NOT_FOUND");
    await expectAppError(service.remove(USER_B, id), "NOT_FOUND");
    expect((await service.list(USER_B, NOW)).items).toHaveLength(0);

    await service.remove(USER_A, id);
    expect((await service.list(USER_A, NOW)).items).toHaveLength(0);
  });

  it("does not change balances or create transactions", async () => {
    const card = await account();
    await service.create(USER_A, plan(card.id));
    expect(await t.db.select().from(transactions)).toHaveLength(0);
  });

  it("rejects invalid plans through the schema", async () => {
    const card = await account();
    await expect(service.create(USER_A, plan(card.id, { installmentCount: 1 }))).rejects.toThrow();
    await expect(service.create(USER_A, plan(card.id, { installmentCents: 0 }))).rejects.toThrow();
  });
});
