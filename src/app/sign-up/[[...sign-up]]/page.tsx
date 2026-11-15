import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";

import { AuthSplitLayout } from "@/modules/auth/components/auth-split-layout";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function SignUpPage() {
  return (
    <AuthSplitLayout>
      <Suspense>
        <SignUp />
      </Suspense>
    </AuthSplitLayout>
  );
}
