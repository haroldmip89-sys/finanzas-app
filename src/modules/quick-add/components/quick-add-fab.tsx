"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { QuickAddMenu } from "./quick-add-menu";

/** "+" over the centre slot of the bottom bar, on every screen of the app. */
export function QuickAddFab() {
  return (
    <div className="fixed bottom-[calc(2.25rem+env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2 md:hidden">
      <QuickAddMenu
        trigger={
          <Button
            size="icon"
            aria-label="Nuevo registro"
            className="size-14 rounded-full border-4 border-background shadow-lg"
          >
            <Plus className="size-6" strokeWidth={2.4} />
          </Button>
        }
      />
    </div>
  );
}
