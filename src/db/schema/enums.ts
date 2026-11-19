import { pgEnum } from "drizzle-orm/pg-core";

export const accountTypeEnum = pgEnum("account_type", [
  "cash",
  "bank",
  "card",
  "wallet",
]);

// Why a purchase was avoided (all optional in the form).
export const avoidedReasonEnum = pgEnum("avoided_reason", [
  "not_needed",
  "out_of_budget",
  "can_wait",
  "other",
]);

// "avoided" counts in the totals; "postponed" may still end in a purchase.
export const avoidedStatusEnum = pgEnum("avoided_status", ["avoided", "postponed"]);

// Also used by transactions.type: a composite FK needs identical column types.
export const categoryKindEnum = pgEnum("category_kind", ["income", "expense"]);
