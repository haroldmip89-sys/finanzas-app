import { sql } from "drizzle-orm";
import { bigint, boolean, check, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Per-user preferences (one row per user, created the first time they are saved).
 * Without a row the app uses the defaults below. Today: the mindful purchase
 * feature (spec 010c).
 */
export const userSettings = pgTable(
  "user_settings",
  {
    // Clerk user id. The app has no users table (system-design.md §3).
    userId: text("user_id").primaryKey(),
    mindfulEnabled: boolean("mindful_enabled").notNull().default(true),
    // Cents of PEN: an expense above this shows the soft "think it over" hint.
    mindfulThresholdCents: bigint("mindful_threshold_cents", { mode: "number" })
      .notNull()
      .default(10000),
    // Default pause offered by "Pensarlo": 10 minutes or 24 hours.
    mindfulPauseMinutes: integer("mindful_pause_minutes").notNull().default(1440),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    check("user_settings_threshold_positive", sql`${t.mindfulThresholdCents} > 0`),
    check("user_settings_pause_allowed", sql`${t.mindfulPauseMinutes} in (10, 1440)`),
  ],
);
