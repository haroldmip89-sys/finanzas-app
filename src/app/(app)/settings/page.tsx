import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";

import { SettingsPage } from "@/modules/settings/components/settings-page";

export const metadata: Metadata = { title: "Ajustes" };

export default async function Page() {
  await auth.protect();
  return <SettingsPage />;
}
