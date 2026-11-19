import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";

import { AvoidedPage } from "@/modules/avoided-purchases/components/avoided-page";

export const metadata: Metadata = { title: "Compras evitadas" };

export default async function Page() {
  await auth.protect();
  return <AvoidedPage />;
}
