import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Página no encontrada" };

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold">No encontramos esta página</h1>
      <p className="text-[15px] text-muted-foreground">
        Puede que el enlace haya cambiado o que ya no exista. Tus datos están a salvo.
      </p>
      <Link href="/dashboard" className={buttonVariants()}>
        Ir a Inicio
      </Link>
    </main>
  );
}
