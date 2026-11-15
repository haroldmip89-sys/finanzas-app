import { sql } from "drizzle-orm";
import { bigint, boolean, check, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** One row per user, created on first save. Missing row = defaults. */
export const userSettings = pgTable(
  "user_settings",
  {
    // Clerk user id. The app has no users table (system-design.md §3).
    userId: text("user_id").primaryKey(),
    mindfulEnabled: boolean("mindful_enabled").notNull().default(true),
    // Expenses at or above this amount open the "compra consciente" step.
    mindfulThresholdCents: bigint("mindful_threshold_cents", { mode: "number" })
      .notNull()
      .default(10000),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [check("user_settings_threshold_positive", sql`${t.mindfulThresholdCents} > 0`)],
);
