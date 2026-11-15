import { auth } from "@clerk/nextjs/server";

import { TransactionsPage } from "@/modules/transactions/components/transactions-page";

export default async function Page() {
  await auth.protect();
  return <TransactionsPage />;
}
