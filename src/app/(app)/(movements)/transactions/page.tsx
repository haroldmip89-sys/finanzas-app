import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";

import { TransactionsPage } from "@/modules/transactions/components/transactions-page";

export const metadata: Metadata = { title: "Movimientos" };

export default async function Page() {
  await auth.protect();
  return <TransactionsPage />;
}
