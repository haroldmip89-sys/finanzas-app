import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { accounts } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import type { Database } from "@/db/types";
import { AppError } from "@/lib/errors";

import type { TransferInput } from "../schemas/transfer.schema";
import { createTransfersService } from "./transfers.service";

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

describe("transfers service", () => {
  let t: TestDb;
  let service: ReturnType<typeof createTransfersService>;

  beforeAll(async () => {
    t = await createTestDb();
    service = createTransfersService(t.db as unknown as Database);
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
    const [row] = await t.db
      .insert(accounts)
      .values({ userId, name, type: "bank" })
      .returning();
    return row;
  }

  async function setup(userId = USER_A) {
    const bbva = await seedAccount(userId, "BBVA");
    const yape = await seedAccount(userId, "Yape");
    const input: TransferInput = {
      fromAccountId: bbva.id,
      toAccountId: yape.id,
      amountCents: 20000,
      date: "2026-11-15",
      note: null,
    };
    return { bbva, yape, input };
  }

  async function archive(accountId: string) {
    await t.client.exec(`UPDATE accounts SET archived_at = now() WHERE id = '${accountId}'`);
  }

  describe("create", () => {
    it("creates a transfer for the user and trims the note", async () => {
      const { input } = await setup();

      const created = await service.create(USER_A, { ...input, note: " Ahorro " });

      expect(created).toMatchObject({ userId: USER_A, amountCents: 20000, note: "Ahorro" });
    });

    it("rejects the same account as origin and destination", async () => {
      const { bbva, input } = await setup();

      await expect(
        service.create(USER_A, { ...input, toAccountId: bbva.id }),
      ).rejects.toThrow();
    });

    it("rejects an origin or destination owned by another user with field errors", async () => {
      const { input } = await setup();
      const foreign = await seedAccount(USER_B, "Ajena");

      const fromError = await expectAppError(
        service.create(USER_A, { ...input, fromAccountId: foreign.id }),
        "VALIDATION",
      );
      const toError = await expectAppError(
        service.create(USER_A, { ...input, toAccountId: foreign.id }),
        "VALIDATION",
      );

      expect(fromError.fieldErrors?.fromAccountId).toBeDefined();
      expect(toError.fieldErrors?.toAccountId).toBeDefined();
    });

    it("rejects archived accounts", async () => {
      const { bbva, yape, input } = await setup();
      await archive(bbva.id);
      await archive(yape.id);

      const error = await expectAppError(service.create(USER_A, input), "VALIDATION");

      expect(error.fieldErrors?.fromAccountId).toMatch(/archivada/);
      expect(error.fieldErrors?.toAccountId).toMatch(/archivada/);
    });

    it("revalidates the input", async () => {
      const { input } = await setup();

      await expect(service.create(USER_A, { ...input, amountCents: 0 })).rejects.toThrow();
      await expect(service.create(USER_A, { ...input, date: "2026-02-30" })).rejects.toThrow();
    });

    it("allows transferring more than the origin balance", async () => {
      const { input } = await setup();

      await expect(
        service.create(USER_A, { ...input, amountCents: 99_999_999 }),
      ).resolves.toBeDefined();
    });
  });

  describe("update", () => {
    it("updates the fields", async () => {
      const { input } = await setup();
      const created = await service.create(USER_A, input);

      const updated = await service.update(USER_A, created.id, {
        ...input,
        amountCents: 555,
        note: "Ajuste",
      });

      expect(updated).toMatchObject({ amountCents: 555, note: "Ajuste" });
    });

    it("keeps accounts that were archived after the transfer", async () => {
      const { bbva, yape, input } = await setup();
      const created = await service.create(USER_A, input);
      await archive(bbva.id);
      await archive(yape.id);

      await expect(
        service.update(USER_A, created.id, { ...input, amountCents: 1000 }),
      ).resolves.toMatchObject({ amountCents: 1000 });
    });

    it("rejects moving to an archived account", async () => {
      const { input } = await setup();
      const created = await service.create(USER_A, input);
      const old = await seedAccount(USER_A, "Vieja");
      await archive(old.id);

      await expectAppError(
        service.update(USER_A, created.id, { ...input, toAccountId: old.id }),
        "VALIDATION",
      );
    });
  });

  describe("isolation between users", () => {
    it("returns NOT_FOUND when updating or deleting another user's transfer", async () => {
      const { input } = await setup();
      const mine = await service.create(USER_A, input);
      const b = await setup(USER_B);

      await expectAppError(service.update(USER_B, mine.id, b.input), "NOT_FOUND");
      await expectAppError(service.remove(USER_B, mine.id), "NOT_FOUND");
      expect((await service.list(USER_A)).total).toBe(1);
    });

    it("never lists another user's transfers", async () => {
      const a = await setup(USER_A);
      const b = await setup(USER_B);
      await service.create(USER_A, a.input);
      await service.create(USER_B, b.input);

      const page = await service.list(USER_A);

      expect(page.total).toBe(1);
      expect(page.items).toHaveLength(1);
    });
  });

  describe("remove", () => {
    it("deletes the transfer", async () => {
      const { input } = await setup();
      const created = await service.create(USER_A, input);

      await service.remove(USER_A, created.id);

      expect((await service.list(USER_A)).total).toBe(0);
    });
  });

  describe("list", () => {
    async function seedMany() {
      const { bbva, yape, input } = await setup();
      const cash = await seedAccount(USER_A, "Efectivo");
      const rows: TransferInput[] = [
        { ...input, date: "2026-11-01", amountCents: 1000 },
        { ...input, date: "2026-11-10", amountCents: 2000, fromAccountId: yape.id, toAccountId: cash.id },
        { ...input, date: "2026-11-05", amountCents: 3000, fromAccountId: cash.id, toAccountId: bbva.id },
        { ...input, date: "2026-10-20", amountCents: 4000 },
      ];
      for (const row of rows) await service.create(USER_A, row);
      return { bbva, yape, cash };
    }

    it("orders by date descending and joins both account names", async () => {
      await seedMany();

      const page = await service.list(USER_A);

      expect(page.items.map((i) => i.date)).toEqual([
        "2026-11-10",
        "2026-11-05",
        "2026-11-01",
        "2026-10-20",
      ]);
      expect(page.items[0]).toMatchObject({ fromAccountName: "Yape", toAccountName: "Efectivo" });
    });

    it("orders same-day items by creation, newest first", async () => {
      const { input } = await setup();
      const first = await service.create(USER_A, { ...input, amountCents: 100 });
      const second = await service.create(USER_A, { ...input, amountCents: 200 });

      const page = await service.list(USER_A);

      expect(page.items.map((i) => i.id)).toEqual([second.id, first.id]);
    });

    it("filters by date range (inclusive)", async () => {
      await seedMany();

      const page = await service.list(USER_A, { from: "2026-11-01", to: "2026-11-05" });

      expect(page.total).toBe(2);
    });

    it("filters by account as origin or destination", async () => {
      const { bbva, cash } = await seedMany();

      // bbva: origin in 2 transfers, destination in 1
      expect((await service.list(USER_A, { accountId: bbva.id })).total).toBe(3);
      // cash: destination in 1, origin in 1
      expect((await service.list(USER_A, { accountId: cash.id })).total).toBe(2);
    });

    it("combines account and date filters", async () => {
      const { bbva } = await seedMany();

      const page = await service.list(USER_A, {
        accountId: bbva.id,
        from: "2026-11-01",
        to: "2026-11-30",
      });

      expect(page.total).toBe(2);
    });

    it("paginates and returns an empty page when out of range", async () => {
      await seedMany();

      const second = await service.list(USER_A, { pageSize: 3, page: 2 });
      const far = await service.list(USER_A, { pageSize: 3, page: 9 });

      expect(second.items).toHaveLength(1);
      expect(far.items).toHaveLength(0);
      expect(far.total).toBe(4);
    });

    it("rejects an invalid range", async () => {
      await expect(
        service.list(USER_A, { from: "2026-11-20", to: "2026-11-10" }),
      ).rejects.toThrow();
    });
  });
});
