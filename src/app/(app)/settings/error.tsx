"use client";

import { ErrorMessage } from "@/components/shared/error-message";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorMessage
      message="No se pudo cargar la página. Inténtalo de nuevo."
      onRetry={reset}
    />
  );
}
