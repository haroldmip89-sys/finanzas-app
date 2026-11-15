import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createTestDb } from "@/db/test-db";
import type { Database } from "@/db/types";

import { createMindfulSettingsService } from "./mindful-settings.service";

type TestDb = Awaited<ReturnType<typeof createTestDb>>;

describe("mindful settings service", () => {
  let t: TestDb;
  let service: ReturnType<typeof createMindfulSettingsService>;

  beforeAll(async () => {
    t = await createTestDb();
    service = createMindfulSettingsService(t.db as unknown as Database);
  });

  afterAll(async () => {
    await t.client.close();
  });

  beforeEach(async () => {
    await t.client.exec("TRUNCATE user_settings");
  });

  it("returns the defaults when nothing was saved", async () => {
    expect(await service.get("u1")).toEqual({ enabled: true, thresholdCents: 10000 });
  });

  it("saves and updates the settings", async () => {
    await service.save("u1", { enabled: false, thresholdCents: 25000 });
    expect(await service.get("u1")).toEqual({ enabled: false, thresholdCents: 25000 });

    await service.save("u1", { enabled: true, thresholdCents: 5000 });
    expect(await service.get("u1")).toEqual({ enabled: true, thresholdCents: 5000 });
  });

  it("keeps each user's settings apart", async () => {
    await service.save("u1", { enabled: false, thresholdCents: 25000 });
    expect(await service.get("u2")).toEqual({ enabled: true, thresholdCents: 10000 });
  });

  it("rejects a zero or fractional threshold", async () => {
    await expect(service.save("u1", { enabled: true, thresholdCents: 0 })).rejects.toThrow();
    await expect(service.save("u1", { enabled: true, thresholdCents: 10.5 })).rejects.toThrow();
  });
});
