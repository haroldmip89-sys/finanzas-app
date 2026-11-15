import Link from "next/link";
import type { ReactNode } from "react";

import { ImageCarousel } from "@/components/shared/image-carousel";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { authSlides } from "@/modules/auth/content/auth-slides";

export function AuthSplitLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-background text-foreground lg:grid lg:grid-cols-2">
      {/* Hidden below lg: the images are not shown nor downloaded on mobile. */}
      <div className="relative hidden bg-muted lg:block">
        <ImageCarousel
          slides={authSlides}
          sizes="(min-width: 1024px) 50vw, 0px"
          className="absolute inset-0"
        />
      </div>
      <div className="relative flex min-h-dvh items-center justify-center px-4 py-20">
        <Link
          href="/"
          className="absolute left-4 top-4 flex min-h-11 items-center text-base font-semibold"
        >
          Finanzas
        </Link>
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        {children}
      </div>
    </main>
  );
}
