"use client";

import { TriangleAlert } from "lucide-react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";

type RouteErrorProps = {
  /** Retries the render of the segment (Next.js passes it as `reset`). */
  onRetry: () => void;
  /** Hide the "go home" link on the home screen itself. */
  showHome?: boolean;
};

/**
 * Full-section error for a route that failed to render. It never shows the
 * technical error: only a calm message, a retry and a way out.
 */
export function RouteError({ onRetry, showHome = true }: RouteErrorProps) {
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-3xl border border-border bg-card px-6 py-12 text-center text-card-foreground"
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-warning/12 text-warning dark:bg-warning/15">
        <TriangleAlert aria-hidden="true" className="size-7" />
      </span>
      <div className="space-y-1.5">
        <h1 className="text-[17px] font-semibold">Algo salió mal</h1>
        <p className="text-sm text-muted-foreground">
          No pudimos mostrar esta página. Tus datos están a salvo.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={onRetry}>
          Reintentar
        </Button>
        {showHome && (
          <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
            Volver al inicio
          </Link>
        )}
      </div>
    </div>
  );
}
