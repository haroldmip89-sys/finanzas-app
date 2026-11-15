import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { categoryKindEnum } from "./enums";

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Clerk user id. The app has no users table (system-design.md §3).
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    kind: categoryKindEnum("kind").notNull(),
    icon: text("icon"),
    color: text("color"),
    // Set only for categories created by the app (e.g. balance adjustments).
    // They are hidden from the user and unusable in normal transactions.
    systemKey: text("system_key"),
    // Archive instead of deleting categories that have transactions.
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
    unique("categories_user_kind_name_unique").on(t.userId, t.kind, t.name),
    // Target of the composite FKs from transactions and budgets
    // (ownership and kind invariants).
    unique("categories_id_user_kind_unique").on(t.id, t.userId, t.kind),
    // NULLs do not collide, so this only limits each system key to one per user.
    unique("categories_user_system_key_unique").on(t.userId, t.systemKey),
    check(
      "categories_system_key_valid",
      sql`${t.systemKey} IS NULL
        OR (${t.systemKey} = 'adjustment_income' AND ${t.kind} = 'income')
        OR (${t.systemKey} = 'adjustment_expense' AND ${t.kind} = 'expense')`,
    ),
  ],
);
