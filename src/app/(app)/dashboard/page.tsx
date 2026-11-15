import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { DashboardPage } from "@/modules/dashboard/components/dashboard-page";

export const metadata: Metadata = { title: "Inicio" };

export default async function Page() {
  await auth.protect();

  return (
    <div className="space-y-6">
      <PageHeader title="Inicio" description="Cuánto puedes gastar y cómo vas este mes." />
      <DashboardPage />
    </div>
  );
}
