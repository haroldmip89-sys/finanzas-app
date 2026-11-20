"use client";

import { Button } from "@/components/ui/button";
import { EntitySelect } from "@/components/shared/entity-select";
import { ErrorMessage } from "@/components/shared/error-message";
import { FormField } from "@/components/shared/form-field";
import { MoneyInput } from "@/components/shared/money-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ExpensePrefill } from "@/modules/quick-add/hooks/use-quick-add";
import { cn } from "@/lib/utils";

import { useEvaluatePurchase, type Pause } from "../hooks/use-evaluate-purchase";

type EvaluateProps = {
  onBuy: (prefill: ExpensePrefill) => void;
  onClose: () => void;
};

function EvaluateForm({ onBuy, onClose }: EvaluateProps) {
  const e = useEvaluatePurchase({ onBuy, onClose });

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Evaluar una compra</DialogTitle>
        <DialogDescription>
          Mira cómo encaja antes de decidir. No registra ningún gasto ni cambia tus saldos.
        </DialogDescription>
      </DialogHeader>

      <FormField label="Monto (S/)" htmlFor="evaluate-amount">
        <MoneyInput
          id="evaluate-amount"
          autoFocus
          value={e.amount}
          onValueChange={e.setAmount}
          className="h-16 rounded-2xl bg-background px-4 text-4xl font-extrabold tracking-tight"
        />
      </FormField>

      <FormField label="Categoría (opcional)" htmlFor="evaluate-category">
        <EntitySelect
          id="evaluate-category"
          value={e.categoryId}
          options={e.categoryOptions}
          placeholder="Sin categoría"
          onChange={e.setCategoryId}
        />
      </FormField>

      {e.hasAmount && (e.budgetText || e.affordabilityText) && (
        <ul aria-label="Cómo encaja" className="space-y-2 rounded-2xl bg-background p-4 text-sm">
          {e.budgetText && <li>{e.budgetText}</li>}
          {e.affordabilityText && <li>{e.affordabilityText}</li>}
        </ul>
      )}

      <div className="space-y-2">
        <p className="text-sm font-semibold">¿Es necesaria? (opcional)</p>
        <div className="flex gap-2">
          {(
            [
              ["needed", "Es necesaria"],
              ["can_wait", "Puede esperar"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={e.necessity === value}
              onClick={() => e.toggleNecessity(value)}
              className={cn(
                "flex min-h-11 flex-1 items-center justify-center rounded-xl border px-3 text-[15px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring",
                e.necessity === value
                  ? "border-primary bg-primary/12 text-primary dark:bg-primary/15"
                  : "border-input text-foreground hover:bg-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {e.submitError && <ErrorMessage message={e.submitError} />}

      <div className="space-y-2 pt-1">
        <Button type="button" className="w-full" disabled={!e.hasAmount} onClick={e.buy}>
          La compraré
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={!e.hasAmount || e.isPending}
          onClick={e.avoid}
        >
          No la compraré
        </Button>
        <div className="space-y-2 rounded-2xl border border-border p-3">
          <p className="text-[13px] text-muted-foreground">Pensarlo: te lo recordamos en…</p>
          <Tabs value={String(e.pause)} onValueChange={(v) => e.setPause(Number(v) as Pause)}>
            <TabsList className="w-full">
              <TabsTrigger value="10" className="flex-1">
                10 minutos
              </TabsTrigger>
              <TabsTrigger value="1440" className="flex-1">
                24 horas
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={!e.hasAmount || e.isPending}
            onClick={e.think}
          >
            Pensarlo
          </Button>
        </div>
      </div>
    </div>
  );
}

type EvaluatePurchaseDialogProps = EvaluateProps & { open: boolean };

export function EvaluatePurchaseDialog({ open, ...props }: EvaluatePurchaseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && props.onClose()}>
      <DialogContent sheet>
        {/* Mounted only while open, so it always starts empty. */}
        <EvaluateForm {...props} />
      </DialogContent>
    </Dialog>
  );
}
