import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestDb } from "./test-db";

type TestDb = Awaited<ReturnType<typeof createTestDb>>;

describe("migrations", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createTestDb();
  });

  afterAll(async () => {
    await testDb.client.close();
  });

  it("apply from scratch and create the expected tables", async () => {
    const { rows } = await testDb.client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' ORDER BY table_name`,
    );

    expect(rows.map((r) => r.table_name)).toEqual([
      "accounts",
      "budgets",
      "categories",
      "transactions",
    ]);
  });

  it("create the expected enums", async () => {
    const { rows } = await testDb.client.query<{ typname: string }>(
      `SELECT typname FROM pg_type
       WHERE typtype = 'e' ORDER BY typname`,
    );

    expect(rows.map((r) => r.typname)).toEqual([
      "account_type",
      "category_kind",
    ]);
  });
});
