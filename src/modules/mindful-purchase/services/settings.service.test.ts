import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { userSettings } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import type { Database } from "@/db/types";

import { createSettingsService } from "./settings.service";

type TestDb = Awaited<ReturnType<typeof createTestDb>>;

const USER_A = "user_a";
const USER_B = "user_b";

describe("settings service", () => {
  let t: TestDb;
  let service: ReturnType<typeof createSettingsService>;

  beforeAll(async () => {
    t = await createTestDb();
    service = createSettingsService(t.db as unknown as Database);
  });

  afterAll(async () => {
    await t.client.close();
  });

  beforeEach(async () => {
    await t.client.exec("TRUNCATE user_settings");
  });

  it("returns the defaults when nothing was saved, without creating a row", async () => {
    const settings = await service.get(USER_A);

    expect(settings).toEqual({ enabled: true, thresholdCents: 10000, pauseMinutes: 1440 });
    expect(await t.db.select().from(userSettings)).toHaveLength(0);
  });

  it("creates the row the first time and updates the same one afterwards", async () => {
    await service.save(USER_A, { enabled: false, thresholdCents: 25000, pauseMinutes: 10 });
    await service.save(USER_A, { enabled: true, thresholdCents: 5000, pauseMinutes: 1440 });

    expect(await service.get(USER_A)).toEqual({ enabled: true, thresholdCents: 5000, pauseMinutes: 1440 });
    expect(await t.db.select().from(userSettings)).toHaveLength(1);
  });

  it("keeps each user's settings apart", async () => {
    await service.save(USER_A, { enabled: false, thresholdCents: 25000, pauseMinutes: 10 });

    expect(await service.get(USER_B)).toEqual({ enabled: true, thresholdCents: 10000, pauseMinutes: 1440 });
    expect(await service.get(USER_A)).toMatchObject({ enabled: false });
  });

  it.each([
    ["zero threshold", { enabled: true, thresholdCents: 0, pauseMinutes: 1440 }],
    ["negative threshold", { enabled: true, thresholdCents: -5, pauseMinutes: 1440 }],
    ["decimal threshold", { enabled: true, thresholdCents: 10.5, pauseMinutes: 1440 }],
    ["pause of 60 minutes", { enabled: true, thresholdCents: 1000, pauseMinutes: 60 }],
    ["non-boolean enabled", { enabled: "yes", thresholdCents: 1000, pauseMinutes: 10 }],
  ])("rejects %s", async (_label, input) => {
    await expect(service.save(USER_A, input as never)).rejects.toBeDefined();
    expect(await t.db.select().from(userSettings)).toHaveLength(0);
  });
});
