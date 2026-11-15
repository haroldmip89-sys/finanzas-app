import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";

import { AuthSplitLayout } from "@/modules/auth/components/auth-split-layout";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function SignInPage() {
  return (
    <AuthSplitLayout>
      <Suspense>
        <SignIn />
      </Suspense>
    </AuthSplitLayout>
  );
}
