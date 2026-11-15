import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { categories, transactions } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import type { Database } from "@/db/types";
import { AppError } from "@/lib/errors";

import { createAvoidedPurchasesService } from "./avoided-purchases.service";

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

describe("avoided purchases service", () => {
  let t: TestDb;
  let service: ReturnType<typeof createAvoidedPurchasesService>;

  beforeAll(async () => {
    t = await createTestDb();
    service = createAvoidedPurchasesService(t.db as unknown as Database);
  });

  afterAll(async () => {
    await t.client.close();
  });

  beforeEach(async () => {
    await t.client.exec(
      "TRUNCATE avoided_purchases, transactions, categories, accounts RESTART IDENTITY CASCADE",
    );
  });

  async function seedCategory(
    userId = USER_A,
    name = "Ropa",
    kind: "income" | "expense" = "expense",
    extra: { archivedAt?: Date; systemKey?: "adjustment_expense" } = {},
  ) {
    const [row] = await t.db
      .insert(categories)
      .values({ userId, name, kind, icon: "shirt", ...extra })
      .returning();
    return row;
  }

  const base = { amountCents: 15000, date: "2026-11-10" };

  it("creates an avoided purchase and counts it in the month", async () => {
    const category = await seedCategory();
    await service.create(USER_A, { ...base, categoryId: category.id, reason: "can_wait" });
    await service.create(USER_A, { amountCents: 5000, date: "2026-11-12" });

    const { items, summary } = await service.overview(USER_A, NOW);
    expect(items).toHaveLength(2);
    expect(summary.avoidedCount).toBe(2);
    expect(summary.avoidedCents).toBe(20000);
    expect(summary.byCategory).toEqual([
      { categoryId: category.id, categoryName: "Ropa", cents: 15000, count: 1 },
    ]);
  });

  it("does not touch balances or transactions", async () => {
    await service.create(USER_A, base);
    const rows = await t.db.select().from(transactions);
    expect(rows).toHaveLength(0);
  });

  it("compares with the previous month and ignores older ones", async () => {
    await service.create(USER_A, { amountCents: 10000, date: "2026-10-20" });
    await service.create(USER_A, { amountCents: 7000, date: "2026-09-20" });
    await service.create(USER_A, { amountCents: 3000, date: "2026-11-02" });

    const { summary } = await service.overview(USER_A, NOW);
    expect(summary.avoidedCents).toBe(3000);
    expect(summary.previousAvoidedCents).toBe(10000);
    expect(summary.previousAvoidedCount).toBe(1);
  });

  it("keeps postponed purchases out of the avoided total and lists them first", async () => {
    await service.create(USER_A, { ...base, date: "2026-11-14" });
    await service.create(USER_A, {
      amountCents: 9900,
      date: "2026-11-01",
      status: "postponed",
      revisitAt: "2026-11-16T12:00:00.000Z",
    });

    const { items, summary } = await service.overview(USER_A, NOW);
    expect(summary.avoidedCents).toBe(15000);
    expect(summary.postponedCount).toBe(1);
    expect(summary.postponedCents).toBe(9900);
    expect(items[0].status).toBe("postponed");
    expect(items[0].revisitAt).toBe("2026-11-16T12:00:00.000Z");
  });

  it("marks a postponed purchase as avoided and clears the revisit time", async () => {
    const { id } = await service.create(USER_A, {
      ...base,
      status: "postponed",
      revisitAt: "2026-11-16T12:00:00.000Z",
    });
    await service.markAvoided(USER_A, id);

    const { items, summary } = await service.overview(USER_A, NOW);
    expect(items[0]).toMatchObject({ status: "avoided", revisitAt: null });
    expect(summary.avoidedCents).toBe(15000);
    expect(summary.postponedCount).toBe(0);
  });

  it("removes only the user's own records", async () => {
    const { id } = await service.create(USER_A, base);
    await expectAppError(service.remove(USER_B, id), "NOT_FOUND");
    await expectAppError(service.markAvoided(USER_B, id), "NOT_FOUND");
    await service.remove(USER_A, id);
    expect((await service.overview(USER_A, NOW)).items).toHaveLength(0);
  });

  it("isolates the overview by user", async () => {
    await service.create(USER_A, base);
    const { items, summary } = await service.overview(USER_B, NOW);
    expect(items).toHaveLength(0);
    expect(summary.avoidedCents).toBe(0);
  });

  it("rejects foreign, income, system and archived categories", async () => {
    const foreign = await seedCategory(USER_B, "Ajena");
    const income = await seedCategory(USER_A, "Sueldo", "income");
    const system = await seedCategory(USER_A, "Ajuste", "expense", { systemKey: "adjustment_expense" });
    const archived = await seedCategory(USER_A, "Vieja", "expense", { archivedAt: new Date() });

    for (const c of [foreign, income, system, archived]) {
      const error = await expectAppError(
        service.create(USER_A, { ...base, categoryId: c.id }),
        "VALIDATION",
      );
      expect(error.fieldErrors?.categoryId).toBeTruthy();
    }
  });

  it("rejects non-positive amounts through the schema", async () => {
    await expect(service.create(USER_A, { ...base, amountCents: 0 })).rejects.toThrow();
  });

  it("ignores revisitAt when the purchase is not postponed", async () => {
    await service.create(USER_A, { ...base, revisitAt: "2026-11-16T12:00:00.000Z" });
    const { items } = await service.overview(USER_A, NOW);
    expect(items[0].revisitAt).toBeNull();
  });
});

