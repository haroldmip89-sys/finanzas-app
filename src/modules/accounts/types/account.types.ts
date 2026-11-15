import type { accounts } from "@/db/schema";

export type Account = typeof accounts.$inferSelect;
export type AccountType = Account["type"];

/** An account with its current balance (initial + income - expense). */
export type AccountWithBalance = Account & { balanceCents: number };
