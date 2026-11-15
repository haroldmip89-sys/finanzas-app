import type { transactions } from "@/db/schema";

export type Transaction = typeof transactions.$inferSelect;
export type TransactionType = Transaction["type"];

/** A transaction with the names needed to render a list row. */
export type TransactionListItem = {
  id: string;
  type: TransactionType;
  amountCents: number;
  date: string;
  note: string | null;
  accountId: string;
  accountName: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
};

export type TransactionTotals = {
  incomeCents: number;
  expenseCents: number;
};

export type TransactionPage = {
  items: TransactionListItem[];
  total: number;
  page: number;
  pageSize: number;
  /** Totals of the whole filtered set, not just the visible page. */
  totals: TransactionTotals;
};
