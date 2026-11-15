import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";

import { QuickActions } from "@/modules/quick-add/components/quick-actions";

export const metadata: Metadata = { title: "Inicio" };

export default async function DashboardPage() {
  await auth.protect();

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Inicio</h1>
        <p className="text-sm text-muted-foreground">
          Registra un movimiento en segundos.
        </p>
      </section>
      <QuickActions />
    </div>
  );
}
