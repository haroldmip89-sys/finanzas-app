import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";

import { WeeklySummaryPage } from "@/modules/weekly-summary/components/weekly-summary-page";

export const metadata: Metadata = { title: "Resumen semanal" };

export default async function Page() {
  await auth.protect();
  return <WeeklySummaryPage />;
}
