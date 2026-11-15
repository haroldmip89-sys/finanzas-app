"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { QuickAddMenu } from "./quick-add-menu";

/** "Nuevo" button for the desktop sidebar. */
export function QuickAddNewButton() {
  return (
    <QuickAddMenu
      align="start"
      trigger={
        <Button className="w-full">
          <Plus data-icon="inline-start" />
          Nuevo
        </Button>
      }
    />
  );
}
