import { auth } from "@clerk/nextjs/server";

import { BudgetsPage } from "@/modules/budgets/components/budgets-page";

export default async function Page() {
  await auth.protect();
  return <BudgetsPage />;
}
