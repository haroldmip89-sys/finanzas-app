import { auth } from "@clerk/nextjs/server";
import type { ReactNode } from "react";

import { QueryProvider } from "@/components/shared/query-provider";
import { QuickAddFab } from "@/modules/quick-add/components/quick-add-fab";
import { QuickAddProvider } from "@/modules/quick-add/components/quick-add-provider";
import { AppSidebar } from "@/modules/shell/components/app-sidebar";
import { BottomNav } from "@/modules/shell/components/bottom-nav";
import { TopBar } from "@/modules/shell/components/top-bar";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Defensa adicional: cada página protegida también llama a auth.protect().
  await auth.protect();

  return (
    <QueryProvider>
      <QuickAddProvider>
        <div className="min-h-dvh bg-background text-foreground">
          <a
            href="#contenido"
            className="sr-only z-50 rounded-xl bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
          >
            Saltar al contenido
          </a>
          <AppSidebar />
          <TopBar />
          <main id="contenido" className="mx-auto w-full max-w-6xl px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:ml-22 md:max-w-none md:px-6 md:pb-8 lg:ml-58 lg:px-8">
            {children}
          </main>
          <BottomNav />
          <QuickAddFab />
        </div>
      </QuickAddProvider>
    </QueryProvider>
  );
}
