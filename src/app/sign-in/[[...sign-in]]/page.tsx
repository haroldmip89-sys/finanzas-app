import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";

import { AuthSplitLayout } from "@/modules/auth/components/auth-split-layout";

export default function SignInPage() {
  return (
    <AuthSplitLayout>
      <Suspense>
        <SignIn />
      </Suspense>
    </AuthSplitLayout>
  );
}
