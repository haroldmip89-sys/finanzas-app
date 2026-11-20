import { eq } from "drizzle-orm";

import { db as defaultDb } from "@/db/client";
import { userSettings } from "@/db/schema";
import type { Database } from "@/db/types";

import {
  DEFAULT_MINDFUL_SETTINGS,
  mindfulSettingsSchema,
  type MindfulSettings,
} from "../schemas/settings.schema";

/** Per-user preferences. Without a saved row the defaults apply. */
export function createSettingsService(db: Database) {
  async function get(userId: string): Promise<MindfulSettings> {
    const [row] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    if (!row) return { ...DEFAULT_MINDFUL_SETTINGS };
    return {
      enabled: row.mindfulEnabled,
      thresholdCents: row.mindfulThresholdCents,
      pauseMinutes: row.mindfulPauseMinutes === 10 ? 10 : 1440,
    };
  }

  /** Creates the row the first time and updates it afterwards (one row per user). */
  async function save(userId: string, input: MindfulSettings): Promise<MindfulSettings> {
    const data = mindfulSettingsSchema.parse(input);
    const values = {
      mindfulEnabled: data.enabled,
      mindfulThresholdCents: data.thresholdCents,
      mindfulPauseMinutes: data.pauseMinutes,
    };
    await db
      .insert(userSettings)
      .values({ userId, ...values })
      .onConflictDoUpdate({ target: userSettings.userId, set: values });
    return data;
  }

  return { get, save };
}

export const settingsService = createSettingsService(defaultDb);
