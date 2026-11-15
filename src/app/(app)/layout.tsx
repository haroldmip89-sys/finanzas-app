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
          <AppSidebar />
          <TopBar />
          <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-[calc(5rem+env(safe-area-inset-bottom))] md:ml-60 md:max-w-none md:px-8 md:pb-8">
            {children}
          </main>
          <BottomNav />
          <QuickAddFab />
        </div>
      </QuickAddProvider>
    </QueryProvider>
  );
}
