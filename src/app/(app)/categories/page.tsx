import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";

import { CategoriesPage } from "@/modules/categories/components/categories-page";

export const metadata: Metadata = { title: "Categorías" };

export default async function Page() {
  await auth.protect();
  return <CategoriesPage />;
}
