import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ThemeToggle } from "@/components/shared/theme-toggle";
import { buttonVariants } from "@/components/ui/button";

export default async function Home() {
  const { isAuthenticated } = await auth();
  if (isAuthenticated) redirect("/dashboard");

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 text-center text-foreground">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Finanzas
        </h1>
        <p className="max-w-md text-sm text-muted-foreground sm:text-base">
          Controla tus ingresos y gastos personales en soles.
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
        <Link href="/sign-in" className={buttonVariants({ size: "lg" })}>
          Iniciar sesión
        </Link>
        <Link
          href="/sign-up"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          Crear cuenta
        </Link>
      </div>
    </main>
  );
}
