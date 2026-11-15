import {
  bigint,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { accountTypeEnum } from "./enums";

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Clerk user id. The app has no users table (system-design.md §3).
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    type: accountTypeEnum("type").notNull(),
    // Cents of PEN; may be negative (credit card).
    initialBalanceCents: bigint("initial_balance_cents", { mode: "number" })
      .notNull()
      .default(0),
    // Archive instead of deleting accounts that have transactions.
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    unique("accounts_user_name_unique").on(t.userId, t.name),
    // Target of the composite FK from transactions (ownership invariant).
    unique("accounts_id_user_unique").on(t.id, t.userId),
  ],
);
