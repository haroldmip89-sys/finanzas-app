import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";

import { InstallmentsPage } from "@/modules/installments/components/installments-page";

export const metadata: Metadata = { title: "Cuotas" };

export default async function Page() {
  await auth.protect();
  return <InstallmentsPage />;
}
