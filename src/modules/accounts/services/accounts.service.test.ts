import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { categories, transactions, transfers } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import type { Database } from "@/db/types";
import { AppError } from "@/lib/errors";

import { createAccountsService } from "./accounts.service";

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

const cash = { name: "Efectivo", type: "cash" as const, initialBalanceCents: 0 };

describe("accounts service", () => {
  let t: TestDb;
  let service: ReturnType<typeof createAccountsService>;

  beforeAll(async () => {
    t = await createTestDb();
    service = createAccountsService(t.db as unknown as Database);
  });

  afterAll(async () => {
    await t.client.close();
  });

  beforeEach(async () => {
    await t.client.exec(
      "TRUNCATE budgets, transactions, categories, accounts RESTART IDENTITY CASCADE",
    );
  });

  describe("create and list", () => {
    it("creates an account for the user with its initial balance", async () => {
      const created = await service.create(USER_A, {
        name: "  BCP ",
        type: "bank",
        initialBalanceCents: 150050,
      });

      expect(created.name).toBe("BCP");
      expect(created.userId).toBe(USER_A);
      expect(created.initialBalanceCents).toBe(150050);
    });

    it("accepts a negative initial balance", async () => {
      const created = await service.create(USER_A, {
        name: "Visa",
        type: "card",
        initialBalanceCents: -20000,
      });

      expect(created.initialBalanceCents).toBe(-20000);
    });

    it("rejects a duplicate name ignoring case, with a field error", async () => {
      await service.create(USER_A, cash);

      const error = await expectAppError(
        service.create(USER_A, { ...cash, name: "efectivo" }),
        "CONFLICT",
      );
      expect(error.fieldErrors?.name).toBeDefined();
    });

    it("allows the same name for different users", async () => {
      await service.create(USER_A, cash);

      await expect(service.create(USER_B, cash)).resolves.toBeDefined();
    });

    it("revalidates the input", async () => {
      await expect(service.create(USER_A, { ...cash, name: "" })).rejects.toThrow();
      await expect(
        service.create(USER_A, { ...cash, initialBalanceCents: 1.5 }),
      ).rejects.toThrow();
    });

    it("lists only the user's accounts, ordered by name", async () => {
      await service.create(USER_A, { ...cash, name: "Zeta" });
      await service.create(USER_A, { ...cash, name: "Alfa" });
      await service.create(USER_B, { ...cash, name: "Ajena" });

      const list = await service.list(USER_A);

      expect(list.map((a) => a.name)).toEqual(["Alfa", "Zeta"]);
    });
  });

  describe("balance", () => {
    async function addTransaction(accountId: string, type: "income" | "expense", cents: number) {
      const [category] = await t.db
        .insert(categories)
        .values({ userId: USER_A, kind: type, name: `${type}-${cents}` })
        .returning();
      await t.db.insert(transactions).values({
        userId: USER_A,
        accountId,
        categoryId: category.id,
        type,
        amountCents: cents,
        date: "2026-11-15",
      });
    }

    it("is the initial balance when there are no transactions", async () => {
      await service.create(USER_A, { ...cash, initialBalanceCents: 5000 });

      const [row] = await service.list(USER_A);

      expect(row.balanceCents).toBe(5000);
    });

    it("adds income and subtracts expenses, per account", async () => {
      const a = await service.create(USER_A, { ...cash, name: "A", initialBalanceCents: 10000 });
      const b = await service.create(USER_A, { ...cash, name: "B", initialBalanceCents: 0 });
      await addTransaction(a.id, "income", 5000);
      await addTransaction(a.id, "expense", 1250);
      await addTransaction(b.id, "expense", 300);

      const list = await service.list(USER_A);

      expect(list.find((x) => x.name === "A")?.balanceCents).toBe(13750);
      expect(list.find((x) => x.name === "B")?.balanceCents).toBe(-300);
    });

    it("works from a negative initial balance (credit card)", async () => {
      const card = await service.create(USER_A, {
        name: "Visa",
        type: "card",
        initialBalanceCents: -20000,
      });
      await addTransaction(card.id, "expense", 1000);

      const [row] = await service.list(USER_A);

      expect(row.balanceCents).toBe(-21000);
    });

    it("subtracts transfers sent and adds transfers received", async () => {
      const bbva = await service.create(USER_A, { ...cash, name: "BBVA", initialBalanceCents: 100000 });
      const yape = await service.create(USER_A, { ...cash, name: "Yape", initialBalanceCents: 0 });
      await t.db.insert(transfers).values({
        userId: USER_A,
        fromAccountId: bbva.id,
        toAccountId: yape.id,
        amountCents: 20000,
        date: "2026-11-15",
      });
      await addTransaction(yape.id, "expense", 1500);

      const list = await service.list(USER_A);

      expect(list.find((x) => x.name === "BBVA")?.balanceCents).toBe(80000);
      expect(list.find((x) => x.name === "Yape")?.balanceCents).toBe(18500);
    });

    it("keeps the total across accounts unchanged by a transfer", async () => {
      const a = await service.create(USER_A, { ...cash, name: "A", initialBalanceCents: 5000 });
      const b = await service.create(USER_A, { ...cash, name: "B", initialBalanceCents: 7000 });
      await t.db.insert(transfers).values({
        userId: USER_A,
        fromAccountId: a.id,
        toAccountId: b.id,
        amountCents: 1234,
        date: "2026-11-15",
      });

      const total = (await service.list(USER_A)).reduce((sum, x) => sum + x.balanceCents, 0);

      expect(total).toBe(12000);
    });

    it("includes balance adjustments (system category transactions)", async () => {
      const a = await service.create(USER_A, { ...cash, name: "A", initialBalanceCents: 10000 });
      const [system] = await t.db
        .insert(categories)
        .values({ userId: USER_A, name: "Ajuste de saldo", kind: "income", icon: "tag", systemKey: "adjustment_income" })
        .returning();
      await t.db.insert(transactions).values({
        userId: USER_A, accountId: a.id, categoryId: system.id, type: "income", amountCents: 2500, date: "2026-11-15",
      });

      const [row] = await service.list(USER_A);

      expect(row.balanceCents).toBe(12500);
    });

    it("never counts another user's transfers", async () => {
      const own = await service.create(USER_A, { ...cash, name: "Propia" });
      const otherFrom = await service.create(USER_B, { ...cash, name: "X" });
      const otherTo = await service.create(USER_B, { ...cash, name: "Y" });
      await t.db.insert(transfers).values({
        userId: USER_B,
        fromAccountId: otherFrom.id,
        toAccountId: otherTo.id,
        amountCents: 9999,
        date: "2026-11-15",
      });

      const [row] = await service.list(USER_A);

      expect(row.id).toBe(own.id);
      expect(row.balanceCents).toBe(0);
    });

    it("never counts another user's transactions", async () => {
      const a = await service.create(USER_A, cash);
      const other = await service.create(USER_B, cash);
      await addTransaction(a.id, "income", 700);

      const [rowB] = await service.list(USER_B);

      expect(rowB.id).toBe(other.id);
      expect(rowB.balanceCents).toBe(0);
    });
  });

  describe("update", () => {
    it("updates the fields", async () => {
      const a = await service.create(USER_A, cash);

      const updated = await service.update(USER_A, a.id, {
        name: "Caja chica",
        type: "wallet",
        initialBalanceCents: 500,
      });

      expect(updated).toMatchObject({
        name: "Caja chica",
        type: "wallet",
        initialBalanceCents: 500,
      });
    });

    it("allows keeping its own name and rejects a taken one", async () => {
      const a = await service.create(USER_A, { ...cash, name: "A" });
      await service.create(USER_A, { ...cash, name: "B" });

      await expect(service.update(USER_A, a.id, { ...cash, name: "A" })).resolves.toBeDefined();
      await expectAppError(service.update(USER_A, a.id, { ...cash, name: "b" }), "CONFLICT");
    });
  });

  describe("include in available money", () => {
    it("defaults to included and lists the flag", async () => {
      await service.create(USER_A, cash);

      const [row] = await service.list(USER_A);

      expect(row.includeInAvailable).toBe(true);
    });

    it("saves a reserve and lets the user include it again", async () => {
      const a = await service.create(USER_A, { ...cash, includeInAvailable: false });
      expect(a.includeInAvailable).toBe(false);

      const back = await service.update(USER_A, a.id, { ...cash, includeInAvailable: true });
      expect(back.includeInAvailable).toBe(true);
    });

    it("keeps the flag when an update does not mention it", async () => {
      const a = await service.create(USER_A, { ...cash, includeInAvailable: false });

      const updated = await service.update(USER_A, a.id, { ...cash, name: "Reserva" });

      expect(updated.includeInAvailable).toBe(false);
    });

    it("ignores the flag on cards: they always stay included", async () => {
      const card = await service.create(USER_A, {
        name: "Visa",
        type: "card",
        initialBalanceCents: -1000,
        includeInAvailable: false,
      });

      expect(card.includeInAvailable).toBe(true);
    });
  });

  describe("isolation between users", () => {
    it("returns NOT_FOUND when touching another user's account", async () => {
      const mine = await service.create(USER_A, { ...cash, name: "Privada" });

      await expectAppError(
        service.update(USER_B, mine.id, { ...cash, name: "Hackeada" }),
        "NOT_FOUND",
      );
      await expectAppError(service.archive(USER_B, mine.id), "NOT_FOUND");
      await expectAppError(service.unarchive(USER_B, mine.id), "NOT_FOUND");
      await expectAppError(service.remove(USER_B, mine.id), "NOT_FOUND");

      const list = await service.list(USER_A);
      expect(list.find((a) => a.id === mine.id)?.name).toBe("Privada");
    });
  });

  describe("archive", () => {
    it("hides archived accounts unless requested, and restores them", async () => {
      const a = await service.create(USER_A, cash);

      await service.archive(USER_A, a.id);
      expect((await service.list(USER_A)).map((x) => x.id)).not.toContain(a.id);
      const all = await service.list(USER_A, { includeArchived: true });
      expect(all.find((x) => x.id === a.id)?.archivedAt).not.toBeNull();

      await service.unarchive(USER_A, a.id);
      expect((await service.list(USER_A)).map((x) => x.id)).toContain(a.id);
    });

    it("lists archived accounts last", async () => {
      const a = await service.create(USER_A, { ...cash, name: "AAA" });
      await service.create(USER_A, { ...cash, name: "ZZZ" });
      await service.archive(USER_A, a.id);

      const all = await service.list(USER_A, { includeArchived: true });

      expect(all[all.length - 1].id).toBe(a.id);
    });
  });

  describe("remove", () => {
    it("deletes an account without transactions", async () => {
      const a = await service.create(USER_A, cash);

      await service.remove(USER_A, a.id);

      expect(await service.list(USER_A, { includeArchived: true })).toHaveLength(0);
    });

    it("returns IN_USE when it has transfers", async () => {
      const a = await service.create(USER_A, { ...cash, name: "A" });
      const b = await service.create(USER_A, { ...cash, name: "B" });
      await t.db.insert(transfers).values({
        userId: USER_A,
        fromAccountId: a.id,
        toAccountId: b.id,
        amountCents: 100,
        date: "2026-11-15",
      });

      await expectAppError(service.remove(USER_A, b.id), "IN_USE");
      await expectAppError(service.remove(USER_A, a.id), "IN_USE");
    });

    it("returns IN_USE when it has transactions", async () => {
      const a = await service.create(USER_A, cash);
      const [category] = await t.db
        .insert(categories)
        .values({ userId: USER_A, name: "Comida", kind: "expense" })
        .returning();
      await t.db.insert(transactions).values({
        userId: USER_A,
        accountId: a.id,
        categoryId: category.id,
        type: "expense",
        amountCents: 500,
        date: "2026-11-15",
      });

      const error = await expectAppError(service.remove(USER_A, a.id), "IN_USE");
      expect(error.message).toMatch(/Archívala/);
    });
  });

  describe("cardSpending", () => {
    const NOW = new Date("2026-11-15T15:00:00Z"); // Nov 2026 in Lima

    async function expense(
      accountId: string,
      cents: number,
      date: string,
      userId = USER_A,
      systemKey: string | null = null,
      kind: "income" | "expense" = "expense",
    ) {
      const [category] = await t.db
        .insert(categories)
        .values({
          userId,
          kind,
          name: `c-${Math.random().toString(36).slice(2)}`,
          systemKey: systemKey as "adjustment_expense" | "adjustment_income" | null,
        })
        .returning();
      await t.db.insert(transactions).values({
        userId,
        accountId,
        categoryId: category.id,
        type: kind,
        amountCents: cents,
        date,
      });
    }

    async function setupCard(userId = USER_A, name = "Visa") {
      return service.create(userId, { name, type: "card", initialBalanceCents: 0 });
    }

    it("is zero without cards or purchases", async () => {
      await service.create(USER_A, cash);

      expect(await service.cardSpending(USER_A, NOW)).toEqual({
        currentMonthCents: 0,
        previousMonthCents: 0,
      });
    });

    it("sums this month and last month separately", async () => {
      const card = await setupCard();
      await expense(card.id, 10000, "2026-11-03");
      await expense(card.id, 2500, "2026-11-14");
      await expense(card.id, 7000, "2026-10-20");

      expect(await service.cardSpending(USER_A, NOW)).toEqual({
        currentMonthCents: 12500,
        previousMonthCents: 7000,
      });
    });

    it("includes the first and last day of each month and nothing outside", async () => {
      const card = await setupCard();
      await expense(card.id, 1, "2026-11-01");
      await expense(card.id, 2, "2026-11-30");
      await expense(card.id, 4, "2026-10-01");
      await expense(card.id, 8, "2026-10-31");
      await expense(card.id, 1000, "2026-09-30");
      await expense(card.id, 2000, "2026-12-01");

      expect(await service.cardSpending(USER_A, NOW)).toEqual({
        currentMonthCents: 3,
        previousMonthCents: 12,
      });
    });

    it("adds up several cards", async () => {
      const visa = await setupCard(USER_A, "Visa");
      const master = await setupCard(USER_A, "Master");
      await expense(visa.id, 1000, "2026-11-05");
      await expense(master.id, 500, "2026-11-06");

      expect((await service.cardSpending(USER_A, NOW)).currentMonthCents).toBe(1500);
    });

    it("ignores spending on accounts that are not cards", async () => {
      const bank = await service.create(USER_A, { ...cash, name: "BBVA", type: "bank" });
      const card = await setupCard();
      await expense(bank.id, 9999, "2026-11-05");
      await expense(card.id, 100, "2026-11-05");

      expect((await service.cardSpending(USER_A, NOW)).currentMonthCents).toBe(100);
    });

    it("ignores income and balance adjustments on a card", async () => {
      const card = await setupCard();
      await expense(card.id, 5000, "2026-11-05", USER_A, null, "income");
      await expense(card.id, 3000, "2026-11-06", USER_A, "adjustment_expense");
      await expense(card.id, 200, "2026-11-07");

      expect((await service.cardSpending(USER_A, NOW)).currentMonthCents).toBe(200);
    });

    it("does not count card payments (transfers) as purchases", async () => {
      const card = await setupCard();
      const bank = await service.create(USER_A, { ...cash, name: "BBVA", type: "bank", initialBalanceCents: 50000 });
      await t.db.insert(transfers).values({
        userId: USER_A,
        fromAccountId: bank.id,
        toAccountId: card.id,
        amountCents: 20000,
        date: "2026-11-10",
      });
      await expense(card.id, 300, "2026-11-11");

      expect((await service.cardSpending(USER_A, NOW)).currentMonthCents).toBe(300);
    });

    it("keeps the month of Lima near the month boundary", async () => {
      const card = await setupCard();
      await expense(card.id, 700, "2026-11-30");
      await expense(card.id, 100, "2026-12-01");

      // 02:00 UTC on Dec 1st is still Nov 30th in Lima.
      const result = await service.cardSpending(USER_A, new Date("2026-12-01T02:00:00Z"));

      expect(result.currentMonthCents).toBe(700);
    });

    it("never counts another user's purchases", async () => {
      const mine = await setupCard(USER_A, "Mia");
      const theirs = await setupCard(USER_B, "Suya");
      await expense(mine.id, 400, "2026-11-05");
      await expense(theirs.id, 99999, "2026-11-05", USER_B);

      expect((await service.cardSpending(USER_A, NOW)).currentMonthCents).toBe(400);
      expect((await service.cardSpending(USER_B, NOW)).currentMonthCents).toBe(99999);
    });
  });
});
