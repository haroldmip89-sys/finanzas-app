import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { accounts } from "./accounts.table";

/**
 * A purchase paid in installments on a credit card. It is a reminder only: it
 * never touches balances, budgets or available money (spec 007a-2).
 */
export const installmentPlans = pgTable(
  "installment_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Clerk user id. The app has no users table (system-design.md §3).
    userId: text("user_id").notNull(),
    accountId: uuid("account_id").notNull(),
    name: text("name").notNull(),
    // Price of the purchase, in cents of PEN.
    principalCents: bigint("principal_cents", { mode: "number" }).notNull(),
    installmentCount: integer("installment_count").notNull(),
    installmentCents: bigint("installment_cents", { mode: "number" }).notNull(),
    // First day of the month of the first installment.
    firstDueMonth: date("first_due_month", { mode: "string" }).notNull(),
    paidCount: integer("paid_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    // Same owner as the card.
    foreignKey({
      name: "installment_plans_account_owner_fk",
      columns: [t.accountId, t.userId],
      foreignColumns: [accounts.id, accounts.userId],
    }).onDelete("restrict"),
    check("installment_plans_principal_positive", sql`${t.principalCents} > 0`),
    check("installment_plans_installment_positive", sql`${t.installmentCents} > 0`),
    check("installment_plans_count_range", sql`${t.installmentCount} between 2 and 60`),
    check(
      "installment_plans_paid_range",
      sql`${t.paidCount} >= 0 and ${t.paidCount} <= ${t.installmentCount}`,
    ),
    check(
      "installment_plans_month_first_day",
      sql`${t.firstDueMonth} = date_trunc('month', ${t.firstDueMonth})::date`,
    ),
    index("installment_plans_user_idx").on(t.userId),
  ],
);
