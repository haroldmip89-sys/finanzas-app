"use client";

import { useState } from "react";

import { ErrorMessage } from "@/components/shared/error-message";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPen } from "@/lib/money";
import { useAccounts } from "@/modules/accounts/hooks/use-accounts";
import { useBudgets } from "@/modules/budgets/hooks/use-budgets";

import { evaluateMindfulPurchase, type PauseOption } from "../mindful-purchase";
import type { AvoidedReason } from "@/modules/avoided-purchases/types/avoided-purchase.types";

export type MindfulStepProps = {
  amountCents: number;
  accountId: string;
  categoryId: string;
  /** Day of the purchase, "YYYY-MM-DD". */
  date: string;
  pending: boolean;
  error?: string;
  onRegister: () => void;
  onBack: () => void;
  onPause: (option: PauseOption, reason: AvoidedReason) => void;
};

function signedPen(cents: number): string {
  return cents < 0 ? `−${formatPen(-cents)}` : formatPen(cents);
}

type Answer = "needed" | "can_wait" | "craving" | null;

/** Short, optional pause before saving a big expense. It never blocks the purchase. */
export function MindfulPurchaseStep({
  amountCents,
  accountId,
  categoryId,
  date,
  pending,
  error,
  onRegister,
  onBack,
  onPause,
}: MindfulStepProps) {
  const [answer, setAnswer] = useState<Answer>(null);
  const accounts = useAccounts(false);
  const budgets = useBudgets(date.slice(0, 7));

  const facts =
    accounts.data && budgets.data
      ? evaluateMindfulPurchase({
          amountCents,
          accountId,
          accounts: accounts.data,
          budget: budgets.data.items.find((b) => b.categoryId === categoryId) ?? null,
        })
      : null;

  const reason: AvoidedReason = answer === "craving" ? "not_needed" : "can_wait";

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Antes de registrar</DialogTitle>
        <DialogDescription>
          Un gasto de {formatPen(amountCents)}. Tómate un momento, tú decides.
        </DialogDescription>
      </DialogHeader>

      {answer === null || answer === "needed" ? (
        <div className="space-y-2">
          <p className="text-[15px] font-semibold">¿Es necesaria?</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <Button type="button" variant="outline" onClick={onRegister} disabled={pending}>
              Es necesaria
            </Button>
            <Button type="button" variant="outline" onClick={() => setAnswer("can_wait")} disabled={pending}>
              Puedo esperar
            </Button>
            <Button type="button" variant="outline" onClick={() => setAnswer("craving")} disabled={pending}>
              Es un antojo
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <ul className="space-y-2 rounded-2xl border border-border bg-card p-4 text-[14px]">
            {facts === null ? (
              <li>
                <Skeleton className="h-4 w-56" />
              </li>
            ) : (
              <>
                <li>
                  {facts.budget.kind === "none" ? (
                    "Esta categoría no tiene presupuesto este mes."
                  ) : facts.budget.overByCents > 0 ? (
                    <>Te pasarías del presupuesto por {formatPen(facts.budget.overByCents)}.</>
                  ) : (
                    <>
                      Presupuesto de la categoría: te quedan{" "}
                      {formatPen(facts.budget.remainingBeforeCents)} y quedarían{" "}
                      {formatPen(facts.budget.remainingAfterCents)}.
                    </>
                  )}
                </li>
                <li>
                  {facts.available.affectsAvailable ? (
                    <>
                      Dinero disponible: {signedPen(facts.available.beforeCents)} →{" "}
                      {signedPen(facts.available.afterCents)}
                      {facts.available.perDayAfterCents !== null &&
                        ` (≈ ${formatPen(facts.available.perDayAfterCents)} por día)`}
                      . Estimado.
                    </>
                  ) : (
                    "Sale de tu reserva: tu dinero disponible no cambia."
                  )}
                  {facts.available.affectsAvailable && facts.available.afterCents < 0 && (
                    <span className="block text-muted-foreground">
                      Tu deuda de tarjetas supera tu dinero líquido.
                    </span>
                  )}
                </li>
              </>
            )}
          </ul>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="outline" onClick={() => onPause("10m", reason)} disabled={pending}>
              Pensarlo 10 minutos
            </Button>
            <Button type="button" variant="outline" onClick={() => onPause("24h", reason)} disabled={pending}>
              Pensarlo 24 horas
            </Button>
          </div>
          <p className="text-[13px] text-muted-foreground">
            Si lo piensas, no se registra el gasto y queda en tus compras evitadas como “en espera”.
          </p>
        </div>
      )}

      {error && <ErrorMessage message={error} />}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onBack} disabled={pending}>
          Volver
        </Button>
        {answer !== null && answer !== "needed" && (
          <Button type="button" onClick={onRegister} disabled={pending}>
            {pending ? "Guardando..." : "Registrar gasto"}
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}
