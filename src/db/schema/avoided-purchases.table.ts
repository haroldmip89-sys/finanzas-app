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

import { categories } from "./categories.table";
import { avoidedReasonEnum, avoidedStatusEnum, categoryKindEnum } from "./enums";

/**
 * A purchase the user decided not to make (or to postpone). It is NOT a
 * financial transaction: it never touches balances, budgets or available money.
 */
export const avoidedPurchases = pgTable(
  "avoided_purchases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Clerk user id. The app has no users table (system-design.md §3).
    userId: text("user_id").notNull(),
    // Optional. When null the composite FK below is not checked.
    categoryId: uuid("category_id"),
    // Constant 'expense': lets the composite FK reject income categories.
    categoryKind: categoryKindEnum("category_kind").notNull().default("expense"),
    // Estimated value of what was not bought, in cents of PEN.
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    // Local calendar day in America/Lima.
    date: date("date", { mode: "string" }).notNull(),
    status: avoidedStatusEnum("status").notNull().default("avoided"),
    reason: avoidedReasonEnum("reason"),
    note: text("note"),
    // Suggested moment to decide again; only for postponed purchases.
    revisitAt: timestamp("revisit_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    foreignKey({
      name: "avoided_purchases_category_owner_kind_fk",
      columns: [t.categoryId, t.userId, t.categoryKind],
      foreignColumns: [categories.id, categories.userId, categories.kind],
    }).onDelete("restrict"),
    check("avoided_purchases_kind_expense", sql`${t.categoryKind} = 'expense'`),
    check("avoided_purchases_amount_positive", sql`${t.amountCents} > 0`),
    check(
      "avoided_purchases_revisit_postponed",
      sql`${t.revisitAt} is null or ${t.status} = 'postponed'`,
    ),
    index("avoided_purchases_user_date_idx").on(t.userId, t.date),
  ],
);
