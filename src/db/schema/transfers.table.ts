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

// Moves money between two accounts of the same user. It is not income or
// expense: it has no category and never counts in totals or budgets.
export const transfers = pgTable(
  "transfers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Clerk user id. The app has no users table (system-design.md §3).
    userId: text("user_id").notNull(),
    fromAccountId: uuid("from_account_id").notNull(),
    toAccountId: uuid("to_account_id").notNull(),
    // Cents of PEN, always positive.
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
    // Both accounts must belong to the same user as the transfer.
    foreignKey({
      name: "transfers_from_account_owner_fk",
      columns: [t.fromAccountId, t.userId],
      foreignColumns: [accounts.id, accounts.userId],
    }).onDelete("restrict"),
    foreignKey({
      name: "transfers_to_account_owner_fk",
      columns: [t.toAccountId, t.userId],
      foreignColumns: [accounts.id, accounts.userId],
    }).onDelete("restrict"),
    check("transfers_amount_positive", sql`${t.amountCents} > 0`),
    check("transfers_accounts_differ", sql`${t.fromAccountId} <> ${t.toAccountId}`),
    check(
      "transfers_note_length",
      sql`${t.note} IS NULL OR char_length(${t.note}) <= 280`,
    ),
    index("transfers_user_date_idx").on(t.userId, t.date.desc()),
    index("transfers_user_from_idx").on(t.userId, t.fromAccountId),
    index("transfers_user_to_idx").on(t.userId, t.toAccountId),
  ],
);
