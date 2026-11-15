import { auth } from "@clerk/nextjs/server";

import { AccountsPage } from "@/modules/accounts/components/accounts-page";

export default async function Page() {
  await auth.protect();
  return <AccountsPage />;
}
