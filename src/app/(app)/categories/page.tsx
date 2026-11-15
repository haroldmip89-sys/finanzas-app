import { auth } from "@clerk/nextjs/server";

import { CategoriesPage } from "@/modules/categories/components/categories-page";

export default async function Page() {
  await auth.protect();
  return <CategoriesPage />;
}
