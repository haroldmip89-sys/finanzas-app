import { and, eq, sql } from "drizzle-orm";

import { accounts } from "@/db/schema";
import type { Database } from "@/db/types";

/**
 * The one formula for an account's current balance, in cents:
 * initial + income - expense + transfers in - transfers out.
 * Balance adjustments are plain transactions, so they are included.
 *
 * Columns are qualified by hand: inside a subquery drizzle omits the table
 * prefix, and an unqualified "id" would resolve to the subquery table's own id.
 */
export const accountBalanceSql = sql<number>`(${accounts.initialBalanceCents}
  + coalesce((
      select sum(case when "transactions"."type" = 'income' then "transactions"."amount_cents" else -"transactions"."amount_cents" end)
      from "transactions"
      where "transactions"."account_id" = "accounts"."id" and "transactions"."user_id" = "accounts"."user_id"
    ), 0)
  + coalesce((
      select sum("transfers"."amount_cents")
      from "transfers"
      where "transfers"."to_account_id" = "accounts"."id" and "transfers"."user_id" = "accounts"."user_id"
    ), 0)
  - coalesce((
      select sum("transfers"."amount_cents")
      from "transfers"
      where "transfers"."from_account_id" = "accounts"."id" and "transfers"."user_id" = "accounts"."user_id"
    ), 0)
)::float8`;

/** Current balance of one account of the user, or null if it does not exist. */
export async function getAccountBalanceCents(
  db: Database,
  userId: string,
  accountId: string,
): Promise<number | null> {
  const [row] = await db
    .select({ balanceCents: accountBalanceSql })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.id, accountId)));
  return row?.balanceCents ?? null;
}
