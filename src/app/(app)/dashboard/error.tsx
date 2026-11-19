"use client";

import { RouteError } from "@/components/shared/route-error";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <RouteError onRetry={reset} showHome={false} />;
}
