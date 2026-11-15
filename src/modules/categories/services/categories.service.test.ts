import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { accounts, categories, transactions } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import type { Database } from "@/db/types";
import { AppError } from "@/lib/errors";

import { DEFAULT_CATEGORIES } from "../constants/default-categories";
import { createCategoriesService } from "./categories.service";

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

describe("categories service", () => {
  let t: TestDb;
  let service: ReturnType<typeof createCategoriesService>;

  beforeAll(async () => {
    t = await createTestDb();
    service = createCategoriesService(t.db as unknown as Database);
  });

  afterAll(async () => {
    await t.client.close();
  });

  beforeEach(async () => {
    await t.client.exec(
      "TRUNCATE budgets, transactions, categories, accounts RESTART IDENTITY CASCADE",
    );
  });

  describe("default categories", () => {
    it("seeds the defaults on first list", async () => {
      const list = await service.list(USER_A);

      expect(list).toHaveLength(DEFAULT_CATEGORIES.length);
      expect(list.map((c) => c.name)).toContain("Alimentación");
    });

    it("does not duplicate on repeated access", async () => {
      await service.list(USER_A);
      await service.list(USER_A);

      const all = await t.db.select().from(categories);
      expect(all).toHaveLength(DEFAULT_CATEGORIES.length);
    });

    it("does not duplicate under concurrent access", async () => {
      await Promise.all([
        service.ensureDefaults(USER_A),
        service.ensureDefaults(USER_A),
        service.ensureDefaults(USER_A),
      ]);

      const all = await t.db.select().from(categories);
      expect(all).toHaveLength(DEFAULT_CATEGORIES.length);
    });

    it("does not reseed after the user archives everything", async () => {
      const list = await service.list(USER_A);
      for (const c of list) await service.archive(USER_A, c.id);

      const all = await service.list(USER_A, { includeArchived: true });

      expect(all).toHaveLength(DEFAULT_CATEGORIES.length);
      expect(all.every((c) => c.archivedAt !== null)).toBe(true);
    });

    it("seeds each user independently", async () => {
      await service.list(USER_A);
      const b = await service.list(USER_B);

      expect(b).toHaveLength(DEFAULT_CATEGORIES.length);
      expect(b.every((c) => c.userId === USER_B)).toBe(true);
    });
  });

  describe("create", () => {
    it("creates a category for the user", async () => {
      const created = await service.create(USER_A, {
        name: "  Mascotas ",
        kind: "expense",
        icon: "gift",
      });

      expect(created.name).toBe("Mascotas");
      expect(created.userId).toBe(USER_A);
    });

    it("rejects a duplicate name ignoring case, with a field error", async () => {
      await service.create(USER_A, { name: "Mascotas", kind: "expense", icon: "tag" });

      const error = await expectAppError(
        service.create(USER_A, { name: "mascotas", kind: "expense", icon: "tag" }),
        "CONFLICT",
      );
      expect(error.fieldErrors?.name).toBeDefined();
    });

    it("allows the same name with another kind or another user", async () => {
      await service.create(USER_A, { name: "Otros", kind: "expense", icon: "tag" });

      await expect(
        service.create(USER_A, { name: "Otros", kind: "income", icon: "tag" }),
      ).resolves.toBeDefined();
      await expect(
        service.create(USER_B, { name: "Otros", kind: "expense", icon: "tag" }),
      ).resolves.toBeDefined();
    });

    it("revalidates the input", async () => {
      await expect(
        service.create(USER_A, { name: "", kind: "expense", icon: "tag" }),
      ).rejects.toThrow();
    });
  });

  describe("update", () => {
    it("updates name and icon but never the kind", async () => {
      const created = await service.create(USER_A, {
        name: "Viajes",
        kind: "expense",
        icon: "plane",
      });

      const updated = await service.update(USER_A, created.id, {
        name: "Viajes y turismo",
        icon: "tag",
        // @ts-expect-error the kind is not part of the update input
        kind: "income",
      });

      expect(updated.name).toBe("Viajes y turismo");
      expect(updated.kind).toBe("expense");
    });

    it("allows keeping its own name and rejects a taken one", async () => {
      const a = await service.create(USER_A, { name: "A", kind: "expense", icon: "tag" });
      await service.create(USER_A, { name: "B", kind: "expense", icon: "tag" });

      await expect(
        service.update(USER_A, a.id, { name: "A", icon: "gift" }),
      ).resolves.toBeDefined();
      await expectAppError(
        service.update(USER_A, a.id, { name: "b", icon: "gift" }),
        "CONFLICT",
      );
    });
  });

  describe("isolation between users", () => {
    it("returns NOT_FOUND when touching another user's category", async () => {
      const mine = await service.create(USER_A, {
        name: "Privada",
        kind: "expense",
        icon: "tag",
      });

      await expectAppError(
        service.update(USER_B, mine.id, { name: "Hackeada", icon: "tag" }),
        "NOT_FOUND",
      );
      await expectAppError(service.archive(USER_B, mine.id), "NOT_FOUND");
      await expectAppError(service.unarchive(USER_B, mine.id), "NOT_FOUND");
      await expectAppError(service.remove(USER_B, mine.id), "NOT_FOUND");

      const stillThere = await service.list(USER_A);
      expect(stillThere.find((c) => c.id === mine.id)?.name).toBe("Privada");
    });

    it("never lists another user's categories", async () => {
      await service.create(USER_A, { name: "Solo A", kind: "expense", icon: "tag" });

      const b = await service.list(USER_B);

      expect(b.map((c) => c.name)).not.toContain("Solo A");
    });
  });

  describe("archive", () => {
    it("hides archived categories unless requested, and restores them", async () => {
      const c = await service.create(USER_A, { name: "Vieja", kind: "expense", icon: "tag" });

      await service.archive(USER_A, c.id);
      expect((await service.list(USER_A)).map((x) => x.id)).not.toContain(c.id);
      const all = await service.list(USER_A, { includeArchived: true });
      expect(all.find((x) => x.id === c.id)?.archivedAt).not.toBeNull();

      await service.unarchive(USER_A, c.id);
      expect((await service.list(USER_A)).map((x) => x.id)).toContain(c.id);
    });

    it("lists archived categories last", async () => {
      const c = await service.create(USER_A, { name: "AAA", kind: "expense", icon: "tag" });
      await service.archive(USER_A, c.id);

      const all = await service.list(USER_A, { includeArchived: true });

      expect(all[all.length - 1].id).toBe(c.id);
    });
  });

  describe("remove", () => {
    it("deletes an unused category", async () => {
      const c = await service.create(USER_A, { name: "Temp", kind: "expense", icon: "tag" });

      await service.remove(USER_A, c.id);

      const all = await service.list(USER_A, { includeArchived: true });
      expect(all.map((x) => x.id)).not.toContain(c.id);
    });

    it("returns IN_USE when it has transactions", async () => {
      const c = await service.create(USER_A, { name: "Usada", kind: "expense", icon: "tag" });
      const [account] = await t.db
        .insert(accounts)
        .values({ userId: USER_A, name: "Caja", type: "cash" })
        .returning();
      await t.db.insert(transactions).values({
        userId: USER_A,
        accountId: account.id,
        categoryId: c.id,
        type: "expense",
        amountCents: 500,
        date: "2026-11-15",
      });

      const error = await expectAppError(service.remove(USER_A, c.id), "IN_USE");
      expect(error.message).toMatch(/Archívala/);
    });
  });

  describe("system categories", () => {
    async function seedSystem(userId = USER_A) {
      const [row] = await t.db
        .insert(categories)
        .values({
          userId,
          name: "Ajuste de saldo",
          kind: "income",
          icon: "tag",
          systemKey: "adjustment_income",
        })
        .returning();
      return row;
    }

    it("hides system categories from list, with and without archived", async () => {
      await seedSystem();
      await service.create(USER_A, { name: "Normal", kind: "expense", icon: "tag" });

      const normal = await service.list(USER_A);
      const all = await service.list(USER_A, { includeArchived: true });

      expect(normal.some((c) => c.systemKey !== null)).toBe(false);
      expect(all.some((c) => c.systemKey !== null)).toBe(false);
      expect(normal.map((c) => c.name)).toContain("Normal");
    });

    it("returns NOT_FOUND when updating, archiving or deleting a system category", async () => {
      const system = await seedSystem();

      await expectAppError(
        service.update(USER_A, system.id, { name: "Hackeada", icon: "tag" }),
        "NOT_FOUND",
      );
      await expectAppError(service.archive(USER_A, system.id), "NOT_FOUND");
      await expectAppError(service.unarchive(USER_A, system.id), "NOT_FOUND");
      await expectAppError(service.remove(USER_A, system.id), "NOT_FOUND");

      const [still] = await t.db.select().from(categories).where(eq(categories.id, system.id));
      expect(still).toMatchObject({ name: "Ajuste de saldo", archivedAt: null });
    });

    it("still seeds the default categories when only system categories exist", async () => {
      await seedSystem();

      const list = await service.list(USER_A);

      expect(list).toHaveLength(DEFAULT_CATEGORIES.length);
    });
  });
});
