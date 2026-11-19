import { Compass } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-3xl border border-border bg-card px-6 py-12 text-center text-card-foreground">
        <span className="flex size-14 items-center justify-center rounded-full bg-primary/12 text-primary dark:bg-primary/15">
          <Compass aria-hidden="true" className="size-7" />
        </span>
        <div className="space-y-1.5">
          <h1 className="text-[17px] font-semibold">Esta página no existe</h1>
          <p className="text-sm text-muted-foreground">
            Puede que el enlace esté mal escrito o que ya no esté disponible.
          </p>
        </div>
        <Link href="/dashboard" className={buttonVariants()}>
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
