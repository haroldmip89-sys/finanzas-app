"use client";

import "./globals.css";

import { RouteError } from "@/components/shared/route-error";

/** Replaces the root layout when it fails: it must bring its own html and body. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="es" className="dark">
      <body className="flex min-h-dvh items-center justify-center bg-background p-4 text-foreground">
        <RouteError onRetry={reset} showHome={false} />
      </body>
    </html>
  );
}
