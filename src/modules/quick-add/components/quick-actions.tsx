"use client";

import { ArrowLeftRight, CircleMinus, CirclePlus, Scale } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useQuickAdd, type QuickAddKind } from "../hooks/use-quick-add";

const ACTIONS = [
  { kind: "expense", label: "Nuevo gasto", icon: CircleMinus, tint: "bg-expense/12 text-expense dark:bg-expense/15" },
  { kind: "income", label: "Nuevo ingreso", icon: CirclePlus, tint: "bg-income/12 text-income dark:bg-income/15" },
  { kind: "transfer", label: "Transferir", icon: ArrowLeftRight, tint: "bg-primary/12 text-primary dark:bg-primary/15" },
  { kind: "calibrate", label: "Calibrar saldos", icon: Scale, tint: "bg-info/12 text-info dark:bg-info/15" },
] satisfies { kind: QuickAddKind; label: string; icon: typeof CircleMinus; tint: string }[];

/** Big one-tap buttons for the home screen. */
export function QuickActions() {
  const { open } = useQuickAdd();

  return (
    <section aria-label="Acciones rápidas" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ACTIONS.map(({ kind, label, icon: Icon, tint }) => (
        <Button
          key={kind}
          variant="outline"
          className="h-auto min-h-22 min-w-0 flex-col items-start justify-between gap-2.5 rounded-[18px] border-border bg-card p-3.5 text-left text-[15px] font-semibold whitespace-normal hover:bg-muted"
          onClick={() => open(kind)}
        >
          <span className={cn("flex size-9 items-center justify-center rounded-[11px]", tint)}>
            <Icon aria-hidden="true" className="size-5" />
          </span>
          {label}
        </Button>
      ))}
    </section>
  );
}
