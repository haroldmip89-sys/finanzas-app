import type { transfers } from "@/db/schema";

export type Transfer = typeof transfers.$inferSelect;

/** A transfer with the account names needed to render a list row. */
export type TransferListItem = {
  id: string;
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  amountCents: number;
  date: string;
  note: string | null;
};

export type TransferPage = {
  items: TransferListItem[];
  total: number;
  page: number;
  pageSize: number;
};
