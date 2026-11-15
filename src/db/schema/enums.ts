import { pgEnum } from "drizzle-orm/pg-core";

export const accountTypeEnum = pgEnum("account_type", [
  "cash",
  "bank",
  "card",
  "wallet",
]);

// Also used by transactions.type: a composite FK needs identical column types.
export const categoryKindEnum = pgEnum("category_kind", ["income", "expense"]);

export const avoidedStatusEnum = pgEnum("avoided_status", ["avoided", "postponed"]);

export const avoidedReasonEnum = pgEnum("avoided_reason", [
  "not_needed",
  "over_budget",
  "can_wait",
  "other",
]);
