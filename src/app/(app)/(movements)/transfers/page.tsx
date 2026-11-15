import { auth } from "@clerk/nextjs/server";

import { TransfersPage } from "@/modules/transfers/components/transfers-page";

export default async function Page() {
  await auth.protect();
  return <TransfersPage />;
}
