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
});
