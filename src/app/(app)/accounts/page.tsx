import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";

import { AccountsPage } from "@/modules/accounts/components/accounts-page";

export const metadata: Metadata = { title: "Cuentas" };

export default async function Page() {
  await auth.protect();
  return <AccountsPage />;
}
