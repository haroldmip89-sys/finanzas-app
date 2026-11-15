import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  foreignKey,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { categories } from "./categories.table";
import { categoryKindEnum } from "./enums";

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Clerk user id. The app has no users table (system-design.md §3).
    userId: text("user_id").notNull(),
    categoryId: uuid("category_id").notNull(),
    // Constant 'expense': lets the composite FK reject income categories.
    categoryKind: categoryKindEnum("category_kind").notNull().default("expense"),
    // First day of the month.
    month: date("month", { mode: "string" }).notNull(),
    // Cents of PEN.
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    // Same owner as the category, and the category must be an expense one.
    foreignKey({
      name: "budgets_category_owner_kind_fk",
      columns: [t.categoryId, t.userId, t.categoryKind],
      foreignColumns: [categories.id, categories.userId, categories.kind],
    }).onDelete("restrict"),
    unique("budgets_user_category_month_unique").on(
      t.userId,
      t.categoryId,
      t.month,
    ),
    check("budgets_kind_expense", sql`${t.categoryKind} = 'expense'`),
    check("budgets_amount_positive", sql`${t.amountCents} > 0`),
    check(
      "budgets_month_first_day",
      sql`${t.month} = date_trunc('month', ${t.month})::date`,
    ),
  ],
);
