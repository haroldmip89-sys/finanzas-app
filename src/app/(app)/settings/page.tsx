import { auth } from "@clerk/nextjs/server";

import { SettingsPage } from "@/modules/settings/components/settings-page";

export default async function Page() {
  await auth.protect();
  return <SettingsPage />;
}
