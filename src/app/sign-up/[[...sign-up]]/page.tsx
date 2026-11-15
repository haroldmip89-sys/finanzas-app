import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";

import { AuthSplitLayout } from "@/modules/auth/components/auth-split-layout";

export default function SignUpPage() {
  return (
    <AuthSplitLayout>
      <Suspense>
        <SignUp />
      </Suspense>
    </AuthSplitLayout>
  );
}
