"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { QuickAddMenu } from "./quick-add-menu";

/** "Nuevo" button for the sidebar: icon only in the rail, labelled from 1024 px. */
export function QuickAddNewButton() {
  return (
    <QuickAddMenu
      align="start"
      trigger={
        <Button aria-label="Nuevo" className="w-full">
          <Plus data-icon="inline-start" />
          <span className="hidden lg:inline">Nuevo movimiento</span>
        </Button>
      }
    />
  );
}
