import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";

import { AvoidedPage } from "@/modules/avoided-purchases/components/avoided-page";

export const metadata: Metadata = { title: "Compras evitadas" };

export default async function Page() {
  await auth.protect();
  return <AvoidedPage />;
}
