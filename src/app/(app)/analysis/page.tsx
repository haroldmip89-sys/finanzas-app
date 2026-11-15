import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";

import { BudgetsPage } from "@/modules/budgets/components/budgets-page";

export const metadata: Metadata = { title: "Presupuestos" };

export default async function Page() {
  await auth.protect();
  return <BudgetsPage />;
}
