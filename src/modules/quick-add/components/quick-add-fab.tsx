"use client";

import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";

import { QuickAddMenu } from "./quick-add-menu";

/** Floating "+" on mobile. Hidden on the home screen, which has big buttons. */
export function QuickAddFab() {
  const pathname = usePathname();
  if (pathname === "/dashboard") return null;

  return (
    <div className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 md:hidden">
      <QuickAddMenu
        trigger={
          <Button
            size="icon"
            aria-label="Nuevo registro"
            className="size-14 rounded-full shadow-lg"
          >
            <Plus className="size-6" />
          </Button>
        }
      />
    </div>
  );
}
