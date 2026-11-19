"use client";

import { ChevronDown, Info } from "lucide-react";
import { useState } from "react";

import { ErrorMessage } from "@/components/shared/error-message";
import { Skeleton } from "@/components/ui/skeleton";
import { currentMonthKey, formatDate } from "@/lib/dates";
import { formatPen } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useAccounts } from "@/modules/accounts/hooks/use-accounts";
import { useBudgets } from "@/modules/budgets/hooks/use-budgets";

import { computeAvailableMoney } from "../available-money";
import { computeBudgetAllocation } from "../budget-allocation";

function signedPen(cents: number): string {
  return cents < 0 ? `−${formatPen(-cents)}` : formatPen(cents);
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-3", strong && "font-bold")}>
      <span className={cn(!strong && "text-muted-foreground")}>{label}</span>
      <span className={cn(!strong && "font-semibold")}>{value}</span>
    </div>
  );
}

/** The main figure of the app: what you can really spend until the end of the month. */
export function AvailableMoneyCard() {
  const accounts = useAccounts(false);
  const budgets = useBudgets(currentMonthKey());
  const [open, setOpen] = useState(false);

  if (accounts.isPending) {
    return (
      <section aria-label="Dinero disponible" className="space-y-3 rounded-3xl border border-border bg-card p-5 select-none">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-11 w-56" />
        <Skeleton className="h-4 w-64" />
      </section>
    );
  }

  if (accounts.isError) {
    return (
      <ErrorMessage
        message="No pudimos calcular tu dinero disponible. Tus datos están a salvo."
        onRetry={() => accounts.refetch()}
      />
    );
  }

  const money = computeAvailableMoney(accounts.data);
  const negative = money.availableCents < 0;
  // Until the budgets are known there is no per-day or "unassigned" figure:
  // showing one without them could invite spending money that is earmarked.
  const allocation = budgets.data
    ? computeBudgetAllocation(money.availableCents, budgets.data.items)
    : null;
  const overAllocated = allocation !== null && allocation.hasBudgets && allocation.unassignedCents < 0;

  return (
    <section aria-label="Dinero disponible" className="rounded-3xl border border-border bg-card p-5 text-card-foreground select-none">
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 className="text-[15px] font-semibold text-muted-foreground">Dinero disponible</h2>
        <span className="inline-flex h-6 items-center gap-1 rounded-full border border-dashed border-info px-2.5 text-xs font-semibold text-info">
          <Info aria-hidden="true" className="size-3.5" />
          Estimado
        </span>
      </div>

      <p className="mt-2 text-[40px] leading-[44px] font-extrabold tracking-tight md:text-5xl md:leading-[52px]">
        {signedPen(money.availableCents)}
      </p>

      {negative ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Tu deuda de tarjetas supera tu dinero líquido.
        </p>
      ) : allocation?.hasBudgets ? (
        <div className="mt-2 space-y-1 text-sm">
          <p className="text-muted-foreground">
            Pendiente en presupuestos{" "}
            <span className="font-semibold text-foreground">{formatPen(allocation.pendingCents)}</span>
          </p>
          {overAllocated ? (
            <p className="text-muted-foreground">
              Tus presupuestos pendientes superan tu dinero disponible en{" "}
              <span className="font-semibold text-foreground">{formatPen(-allocation.unassignedCents)}</span>.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Sin asignar a presupuestos{" "}
              <span className="font-semibold text-foreground">{formatPen(allocation.unassignedCents)}</span>
            </p>
          )}
        </div>
      ) : allocation !== null && money.perDayCents !== null ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Sin presupuestos este mes · promedio diario estimado hasta el {formatDate(money.periodEnd)}:{" "}
          <span className="font-semibold text-foreground">≈ {formatPen(money.perDayCents)}</span> (orientativo)
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Hasta el {formatDate(money.periodEnd)}</p>
      )}

      <button
        type="button"
        aria-expanded={open}
        aria-controls="available-money-detail"
        onClick={() => setOpen((v) => !v)}
        className="mt-3 flex min-h-11 items-center gap-1.5 rounded-xl text-sm font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        ¿Cómo se calculó?
        <ChevronDown
          aria-hidden="true"
          className={cn("size-4 transition-transform motion-reduce:transition-none", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          id="available-money-detail"
          className="mt-1 space-y-2.5 rounded-2xl bg-background p-4 text-sm"
        >
          <Row label="Saldo en cuentas" value={formatPen(money.liquidCents)} />
          {money.reservedCents > 0 && (
            <Row label="Reservado" value={`−${formatPen(money.reservedCents)}`} />
          )}
          {money.cardDebtCents > 0 && (
            <Row label="Deuda de tarjetas" value={`−${formatPen(money.cardDebtCents)}`} />
          )}
          <div className="h-px bg-border" />
          <Row label="Disponible" value={signedPen(money.availableCents)} strong />
          {allocation?.hasBudgets && !negative && (
            <>
              <Row label="Pendiente en presupuestos" value={`−${formatPen(allocation.pendingCents)}`} />
              <div className="h-px bg-border" />
              <Row label="Sin asignar" value={signedPen(allocation.unassignedCents)} strong />
            </>
          )}
        </div>
      )}
    </section>
  );
}
