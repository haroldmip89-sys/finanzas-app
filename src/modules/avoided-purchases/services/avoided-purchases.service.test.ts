import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { accounts, categories, transactions } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import type { Database } from "@/db/types";
import { AppError } from "@/lib/errors";

import { createAvoidedPurchasesService } from "./avoided-purchases.service";

type TestDb = Awaited<ReturnType<typeof createTestDb>>;

const USER_A = "user_a";
const USER_B = "user_b";
// 15 Nov 2026 in Lima.
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
      "TRUNCATE avoided_purchases, budgets, transactions, transfers, categories, accounts RESTART IDENTITY CASCADE",
    );
  });

  async function seedCategory(
    userId = USER_A,
    name = "Ropa",
    kind: "income" | "expense" = "expense",
    extra: { systemKey?: "adjustment_expense" | "adjustment_income"; archivedAt?: Date } = {},
  ) {
    const [row] = await t.db
      .insert(categories)
      .values({ userId, name, kind, icon: "shirt", ...extra })
      .returning();
    return row;
  }

  const input = (extra: Record<string, unknown> = {}) => ({
    amountCents: 8990,
    date: "2026-11-10",
    ...extra,
  });

  describe("create", () => {
    it("creates a purchase with only the amount and the date", async () => {
      const row = await service.create(USER_A, input(), NOW);

      expect(row).toMatchObject({
        userId: USER_A,
        amountCents: 8990,
        date: "2026-11-10",
        categoryId: null,
        reason: null,
        note: null,
        status: "avoided",
      });
    });

    it("creates one with category, reason, note and postponed status", async () => {
      const category = await seedCategory();

      const row = await service.create(
        USER_A,
        input({ categoryId: category.id, reason: "can_wait", note: "Zapatillas", status: "postponed" }),
        NOW,
      );

      expect(row).toMatchObject({
        categoryId: category.id,
        reason: "can_wait",
        note: "Zapatillas",
        status: "postponed",
      });
    });

    it("accepts today but not a future day", async () => {
      await expect(service.create(USER_A, input({ date: "2026-11-15" }), NOW)).resolves.toBeDefined();

      const error = await expectAppError(service.create(USER_A, input({ date: "2026-11-16" }), NOW), "VALIDATION");
      expect(error.fieldErrors).toHaveProperty("date");
    });

    it("uses the Lima day to decide what is the future", async () => {
      // 02:00 UTC on 16 Nov is still 15 Nov 21:00 in Lima.
      const lateNight = new Date("2026-11-16T02:00:00Z");

      await expect(service.create(USER_A, input({ date: "2026-11-15" }), lateNight)).resolves.toBeDefined();
      await expectAppError(service.create(USER_A, input({ date: "2026-11-16" }), lateNight), "VALIDATION");
    });

    it.each([
      ["an income category", (u: string) => seedCategory(u, "Sueldo", "income")],
      ["a system category", (u: string) => seedCategory(u, "Ajuste", "expense", { systemKey: "adjustment_expense" })],
      ["an archived category", (u: string) => seedCategory(u, "Vieja", "expense", { archivedAt: new Date() })],
      ["another user's category", () => seedCategory(USER_B, "Ajena")],
    ])("rejects %s with a field error", async (_label, seed) => {
      const category = await seed(USER_A);

      const error = await expectAppError(
        service.create(USER_A, input({ categoryId: category.id }), NOW),
        "VALIDATION",
      );

      expect(error.fieldErrors).toHaveProperty("categoryId");
    });

    it("rejects a category that does not exist", async () => {
      await expectAppError(
        service.create(USER_A, input({ categoryId: "11111111-1111-4111-8111-111111111111" }), NOW),
        "VALIDATION",
      );
    });

    it("never creates a transaction or touches balances", async () => {
      const [account] = await t.db
        .insert(accounts)
        .values({ userId: USER_A, name: "BCP", type: "bank", initialBalanceCents: 100000 })
        .returning();

      await service.create(USER_A, input(), NOW);
      await service.create(USER_A, input({ status: "postponed" }), NOW);

      expect(await t.db.select().from(transactions)).toHaveLength(0);
      const [still] = await t.db.select().from(accounts);
      expect(still.initialBalanceCents).toBe(account.initialBalanceCents);
    });
  });

  describe("update", () => {
    it("replaces the fields", async () => {
      const category = await seedCategory();
      const row = await service.create(USER_A, input(), NOW);

      const updated = await service.update(
        USER_A,
        row.id,
        input({ amountCents: 5000, categoryId: category.id, note: "Otra cosa", reason: "other" }),
        NOW,
      );

      expect(updated).toMatchObject({ amountCents: 5000, categoryId: category.id, note: "Otra cosa", reason: "other" });
    });

    it("keeps an archived category when it does not change, but not a new archived one", async () => {
      const old = await seedCategory(USER_A, "Vieja");
      const other = await seedCategory(USER_A, "Otra");
      const row = await service.create(USER_A, input({ categoryId: old.id }), NOW);
      await t.client.exec(`UPDATE categories SET archived_at = now() WHERE id = '${old.id}'`);
      await t.client.exec(`UPDATE categories SET archived_at = now() WHERE id = '${other.id}'`);

      await expect(
        service.update(USER_A, row.id, input({ categoryId: old.id, amountCents: 100 }), NOW),
      ).resolves.toBeDefined();
      await expectAppError(
        service.update(USER_A, row.id, input({ categoryId: other.id }), NOW),
        "VALIDATION",
      );
    });

    it("can remove the category", async () => {
      const category = await seedCategory();
      const row = await service.create(USER_A, input({ categoryId: category.id }), NOW);

      const updated = await service.update(USER_A, row.id, input({ categoryId: null }), NOW);

      expect(updated.categoryId).toBeNull();
    });

    it("rejects a future date and a missing purchase", async () => {
      const row = await service.create(USER_A, input(), NOW);

      await expectAppError(service.update(USER_A, row.id, input({ date: "2026-12-01" }), NOW), "VALIDATION");
      await expectAppError(
        service.update(USER_A, "11111111-1111-4111-8111-111111111111", input(), NOW),
        "NOT_FOUND",
      );
    });
  });

  describe("setStatus and remove", () => {
    it("moves a postponed purchase to avoided", async () => {
      const row = await service.create(USER_A, input({ status: "postponed" }), NOW);

      const updated = await service.setStatus(USER_A, row.id, "avoided");

      expect(updated.status).toBe("avoided");
    });

    it("deletes a purchase", async () => {
      const row = await service.create(USER_A, input(), NOW);

      await service.remove(USER_A, row.id);

      const overview = await service.list(USER_A, "2026-11", NOW);
      expect(overview.items).toHaveLength(0);
    });

    it("reports a missing purchase as NOT_FOUND", async () => {
      const missing = "11111111-1111-4111-8111-111111111111";

      await expectAppError(service.setStatus(USER_A, missing, "avoided"), "NOT_FOUND");
      await expectAppError(service.remove(USER_A, missing), "NOT_FOUND");
    });
  });

  describe("list", () => {
    it("is empty for a user without purchases", async () => {
      const overview = await service.list(USER_A, "2026-11", NOW);

      expect(overview).toEqual({
        month: "2026-11",
        items: [],
        totals: { avoidedCount: 0, avoidedCents: 0, postponedCount: 0, postponedCents: 0 },
        byCategory: [],
        previous: { count: 0, cents: 0 },
      });
    });

    it("lists the month newest first with category names, and totals by status", async () => {
      const clothes = await seedCategory(USER_A, "Ropa");
      await service.create(USER_A, input({ date: "2026-11-02", amountCents: 1000, categoryId: clothes.id }), NOW);
      await service.create(USER_A, input({ date: "2026-11-12", amountCents: 2500 }), NOW);
      await service.create(USER_A, input({ date: "2026-11-08", amountCents: 4000, status: "postponed" }), NOW);
      // Other months are left out.
      await service.create(USER_A, input({ date: "2026-10-31", amountCents: 9999 }), NOW);

      const overview = await service.list(USER_A, "2026-11", NOW);

      expect(overview.items.map((i) => i.date)).toEqual(["2026-11-12", "2026-11-08", "2026-11-02"]);
      expect(overview.items[2]).toMatchObject({ categoryName: "Ropa", categoryIcon: "shirt" });
      expect(overview.items[0]).toMatchObject({ categoryName: null, categoryIcon: null });
      expect(overview.totals).toEqual({ avoidedCount: 2, avoidedCents: 3500, postponedCount: 1, postponedCents: 4000 });
    });

    it("groups by category counting only avoided purchases", async () => {
      const clothes = await seedCategory(USER_A, "Ropa");
      await service.create(USER_A, input({ amountCents: 1000, categoryId: clothes.id }), NOW);
      await service.create(USER_A, input({ amountCents: 3000 }), NOW);
      await service.create(USER_A, input({ amountCents: 99999, categoryId: clothes.id, status: "postponed" }), NOW);

      const overview = await service.list(USER_A, "2026-11", NOW);

      expect(overview.byCategory.map((c) => [c.name, c.cents])).toEqual([
        ["Sin categoría", 3000],
        ["Ropa", 1000],
      ]);
    });

    it("compares with the month before up to the same day, avoided only", async () => {
      await service.create(USER_A, input({ date: "2026-10-01", amountCents: 700 }), NOW);
      await service.create(USER_A, input({ date: "2026-10-15", amountCents: 300 }), NOW);
      await service.create(USER_A, input({ date: "2026-10-16", amountCents: 5000 }), NOW);
      await service.create(USER_A, input({ date: "2026-10-10", amountCents: 8000, status: "postponed" }), NOW);

      const overview = await service.list(USER_A, "2026-11", NOW);

      expect(overview.previous).toEqual({ count: 2, cents: 1000 });
    });

    it("compares a past month in full", async () => {
      await service.create(USER_A, input({ date: "2026-09-30", amountCents: 700 }), NOW);

      const overview = await service.list(USER_A, "2026-10", NOW);

      expect(overview.previous).toEqual({ count: 1, cents: 700 });
    });

    it("only sees the user's own purchases", async () => {
      await service.create(USER_A, input({ amountCents: 1000 }), NOW);
      await service.create(USER_B, input({ amountCents: 777000 }), NOW);

      const overview = await service.list(USER_A, "2026-11", NOW);

      expect(overview.items).toHaveLength(1);
      expect(overview.totals.avoidedCents).toBe(1000);
    });
  });

  describe("isolation between users", () => {
    it("returns NOT_FOUND when touching another user's purchase", async () => {
      const row = await service.create(USER_A, input(), NOW);

      await expectAppError(service.update(USER_B, row.id, input(), NOW), "NOT_FOUND");
      await expectAppError(service.setStatus(USER_B, row.id, "postponed"), "NOT_FOUND");
      await expectAppError(service.remove(USER_B, row.id), "NOT_FOUND");

      const overview = await service.list(USER_A, "2026-11", NOW);
      expect(overview.items).toHaveLength(1);
    });
  });
  describe("reminders", () => {
    const MINUTE = 60_000;

    it("sets the reminder of a postponed purchase from the chosen pause", async () => {
      const short = await service.create(USER_A, input({ status: "postponed", remindInMinutes: 10 }), NOW);
      const long = await service.create(USER_A, input({ status: "postponed", remindInMinutes: 1440 }), NOW);

      expect(short.remindAt?.getTime()).toBe(NOW.getTime() + 10 * MINUTE);
      expect(long.remindAt?.getTime()).toBe(NOW.getTime() + 1440 * MINUTE);
    });

    it("has no reminder without a pause, or on an avoided purchase", async () => {
      const noPause = await service.create(USER_A, input({ status: "postponed" }), NOW);
      const avoided = await service.create(USER_A, input({ status: "avoided", remindInMinutes: 10 }), NOW);

      expect(noPause.remindAt).toBeNull();
      expect(avoided.remindAt).toBeNull();
    });

    it("drops the reminder when a postponed purchase becomes avoided", async () => {
      const row = await service.create(USER_A, input({ status: "postponed", remindInMinutes: 10 }), NOW);

      const updated = await service.setStatus(USER_A, row.id, "avoided");

      expect(updated.remindAt).toBeNull();
    });

    it("keeps the reminder on an edit without a new pause, and restarts it with one", async () => {
      const row = await service.create(USER_A, input({ status: "postponed", remindInMinutes: 10 }), NOW);
      const later = new Date(NOW.getTime() + 5 * MINUTE);

      const kept = await service.update(USER_A, row.id, input({ status: "postponed", note: "otra" }), later);
      const restarted = await service.update(
        USER_A,
        row.id,
        input({ status: "postponed", remindInMinutes: 1440 }),
        later,
      );

      expect(kept.remindAt?.getTime()).toBe(row.remindAt?.getTime());
      expect(restarted.remindAt?.getTime()).toBe(later.getTime() + 1440 * MINUTE);
    });

    it("drops the reminder when an edit turns it into an avoided purchase", async () => {
      const row = await service.create(USER_A, input({ status: "postponed", remindInMinutes: 10 }), NOW);

      const updated = await service.update(USER_A, row.id, input({ status: "avoided" }), NOW);

      expect(updated.remindAt).toBeNull();
    });

    it("lists only the postponed purchases whose pause is over, oldest first", async () => {
      const first = await service.create(USER_A, input({ note: "primera", status: "postponed", remindInMinutes: 10 }), NOW);
      await service.create(USER_A, input({ note: "luego", status: "postponed", remindInMinutes: 1440 }), NOW);
      await service.create(USER_A, input({ note: "evitada", status: "avoided" }), NOW);
      await service.create(USER_A, input({ note: "sin pausa", status: "postponed" }), NOW);
      const after20Min = new Date(NOW.getTime() + 20 * MINUTE);

      expect(await service.listDue(USER_A, NOW)).toHaveLength(0);
      const due = await service.listDue(USER_A, after20Min);

      expect(due.map((d) => d.id)).toEqual([first.id]);
      expect(due[0]).toMatchObject({ note: "primera", status: "postponed" });
    });

    it("lists at most three, the oldest ones", async () => {
      for (let i = 0; i < 5; i++) {
        await service.create(
          USER_A,
          input({ note: `n${i}`, status: "postponed", remindInMinutes: 10 }),
          new Date(NOW.getTime() + i * MINUTE),
        );
      }

      const due = await service.listDue(USER_A, new Date(NOW.getTime() + 1000 * MINUTE));

      expect(due.map((d) => d.note)).toEqual(["n0", "n1", "n2"]);
    });

    it("only lists the user's own reminders", async () => {
      await service.create(USER_B, input({ status: "postponed", remindInMinutes: 10 }), NOW);

      expect(await service.listDue(USER_A, new Date(NOW.getTime() + 60 * MINUTE))).toHaveLength(0);
    });

    it("dismissing stops the reminder but keeps the purchase postponed", async () => {
      const row = await service.create(USER_A, input({ status: "postponed", remindInMinutes: 10 }), NOW);

      const dismissed = await service.dismissReminder(USER_A, row.id);

      expect(dismissed).toMatchObject({ remindAt: null, status: "postponed" });
      expect(await service.listDue(USER_A, new Date(NOW.getTime() + 60 * MINUTE))).toHaveLength(0);
    });

    it("cannot dismiss an avoided purchase or another user's", async () => {
      const avoided = await service.create(USER_A, input({ status: "avoided" }), NOW);
      const mine = await service.create(USER_A, input({ status: "postponed", remindInMinutes: 10 }), NOW);

      await expectAppError(service.dismissReminder(USER_A, avoided.id), "NOT_FOUND");
      await expectAppError(service.dismissReminder(USER_B, mine.id), "NOT_FOUND");
    });
  });
});
