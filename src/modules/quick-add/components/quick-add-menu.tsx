"use client";

import { ArrowLeftRight, CircleMinus, CirclePlus, Lightbulb } from "lucide-react";
import type { ReactElement } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useMindfulSettings } from "@/modules/mindful-purchase/hooks/use-mindful-settings";

import { useQuickAdd } from "../hooks/use-quick-add";

type QuickAddMenuProps = {
  /** The button that opens the menu. */
  trigger: ReactElement;
  align?: "start" | "center" | "end";
};

export function QuickAddMenu({ trigger, align = "end" }: QuickAddMenuProps) {
  const { open } = useQuickAdd();
  const mindful = useMindfulSettings();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent align={align} className="min-w-48">
        <DropdownMenuItem className="min-h-11 md:min-h-10" onClick={() => open("expense")}>
          <CircleMinus /> Nuevo gasto
        </DropdownMenuItem>
        <DropdownMenuItem className="min-h-11 md:min-h-10" onClick={() => open("income")}>
          <CirclePlus /> Nuevo ingreso
        </DropdownMenuItem>
        <DropdownMenuItem className="min-h-11 md:min-h-10" onClick={() => open("transfer")}>
          <ArrowLeftRight /> Transferir
        </DropdownMenuItem>
        {mindful.enabled && (
          <DropdownMenuItem className="min-h-11 md:min-h-10" onClick={() => open("evaluate")}>
            <Lightbulb /> Evaluar una compra
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
