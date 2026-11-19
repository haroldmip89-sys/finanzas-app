"use client";

import { RouteError } from "@/components/shared/route-error";

/** Last resort inside the root layout: any route without its own error page. */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <RouteError onRetry={reset} />
    </div>
  );
}
