"use client";

import { ArrowLeftRight, CircleMinus, CirclePlus, Scale } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useQuickAdd, type QuickAddKind } from "../hooks/use-quick-add";

const ACTIONS = [
  { kind: "expense", label: "Nuevo gasto", icon: CircleMinus },
  { kind: "income", label: "Nuevo ingreso", icon: CirclePlus },
  { kind: "transfer", label: "Transferir", icon: ArrowLeftRight },
  { kind: "calibrate", label: "Calibrar saldos", icon: Scale },
] satisfies { kind: QuickAddKind; label: string; icon: typeof CircleMinus }[];

/** Big one-tap buttons for the home screen. */
export function QuickActions() {
  const { open } = useQuickAdd();

  return (
    <section aria-label="Acciones rápidas" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ACTIONS.map(({ kind, label, icon: Icon }) => (
        <Button
          key={kind}
          variant={kind === "expense" ? "default" : "outline"}
          className="h-auto min-h-20 flex-col gap-2 rounded-xl py-4 text-base"
          onClick={() => open(kind)}
        >
          <Icon aria-hidden="true" className="size-6" />
          {label}
        </Button>
      ))}
    </section>
  );
}
