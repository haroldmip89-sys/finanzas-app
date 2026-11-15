import { eq } from "drizzle-orm";

import { db as defaultDb } from "@/db/client";
import { userSettings } from "@/db/schema";
import type { Database } from "@/db/types";

import { mindfulSettingsSchema, type MindfulSettingsInput } from "../schemas/mindful-settings.schema";
import { DEFAULT_MINDFUL_SETTINGS, type MindfulSettings } from "../types/mindful-purchase.types";

export function createMindfulSettingsService(db: Database) {
  /** The user's settings, or the defaults when nothing was saved yet. */
  async function get(userId: string): Promise<MindfulSettings> {
    const [row] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    if (!row) return DEFAULT_MINDFUL_SETTINGS;
    return { enabled: row.mindfulEnabled, thresholdCents: row.mindfulThresholdCents };
  }

  async function save(userId: string, input: MindfulSettingsInput): Promise<MindfulSettings> {
    const data = mindfulSettingsSchema.parse(input);
    const values = { mindfulEnabled: data.enabled, mindfulThresholdCents: data.thresholdCents };
    await db
      .insert(userSettings)
      .values({ userId, ...values })
      .onConflictDoUpdate({ target: userSettings.userId, set: { ...values, updatedAt: new Date() } });
    return { enabled: data.enabled, thresholdCents: data.thresholdCents };
  }

  return { get, save };
}

export const mindfulSettingsService = createMindfulSettingsService(defaultDb);
