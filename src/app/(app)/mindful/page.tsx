import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";

import { MindfulSettingsPage } from "@/modules/mindful-purchase/components/mindful-settings-page";

export const metadata: Metadata = { title: "Compra consciente" };

export default async function Page() {
  await auth.protect();
  return <MindfulSettingsPage />;
}
