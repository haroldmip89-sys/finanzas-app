import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { accounts } from "./accounts.table";
import { categories } from "./categories.table";
import { categoryKindEnum } from "./enums";

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Clerk user id. The app has no users table (system-design.md §3).
    userId: text("user_id").notNull(),
    accountId: uuid("account_id").notNull(),
    categoryId: uuid("category_id").notNull(),
    // Must match categories.kind (enforced by the composite FK below).
    type: categoryKindEnum("type").notNull(),
    // Cents of PEN, always positive; the sign comes from `type`.
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    // Local calendar day in America/Lima, no time.
    date: date("date", { mode: "string" }).notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    // Same owner as the account.
    foreignKey({
      name: "transactions_account_owner_fk",
      columns: [t.accountId, t.userId],
      foreignColumns: [accounts.id, accounts.userId],
    }).onDelete("restrict"),
    // Same owner as the category, and type = category kind.
    foreignKey({
      name: "transactions_category_owner_kind_fk",
      columns: [t.categoryId, t.userId, t.type],
      foreignColumns: [categories.id, categories.userId, categories.kind],
    }).onDelete("restrict"),
    check("transactions_amount_positive", sql`${t.amountCents} > 0`),
    check(
      "transactions_note_length",
      sql`${t.note} IS NULL OR char_length(${t.note}) <= 280`,
    ),
    index("transactions_user_date_idx").on(t.userId, t.date.desc()),
    index("transactions_user_account_idx").on(t.userId, t.accountId),
    index("transactions_user_category_idx").on(t.userId, t.categoryId),
  ],
);
