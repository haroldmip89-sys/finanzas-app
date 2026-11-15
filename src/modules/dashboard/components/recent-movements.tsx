"use client";

import { Receipt } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { ErrorMessage } from "@/components/shared/error-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/dates";
import { formatPen } from "@/lib/money";
import { cn } from "@/lib/utils";
import { getCategoryIcon } from "@/modules/categories/components/category-icon";
import { useQuickAdd } from "@/modules/quick-add/hooks/use-quick-add";
import { useTransactions } from "@/modules/transactions/hooks/use-transactions";

import { DashboardSection } from "./dashboard-section";

const FILTERS = { page: 1, pageSize: 5 };

/** The five latest movements, adjustments included (marked). */
export function RecentMovements() {
  const query = useTransactions(FILTERS);
  const { open } = useQuickAdd();

  const seeAll = (
    <Link href="/transactions" className="text-sm font-semibold text-primary">
      Ver todos
    </Link>
  );

  if (query.isPending) {
    return (
      <DashboardSection title="Últimos movimientos">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </DashboardSection>
    );
  }
  if (query.isError) {
    return (
      <ErrorMessage
        message="No pudimos cargar tus movimientos. Tus datos están a salvo."
        onRetry={() => query.refetch()}
      />
    );
  }

  const { items } = query.data;

  if (items.length === 0) {
    return (
      <DashboardSection title="Últimos movimientos">
        <EmptyState
          icon={Receipt}
          title="Aún no hay movimientos"
          description="Registra tu primer gasto para empezar."
          action={<Button onClick={() => open("expense")}>Nuevo gasto</Button>}
        />
      </DashboardSection>
    );
  }

  return (
    <DashboardSection title="Últimos movimientos" aside={seeAll}>
      <ul className="-my-1 divide-y divide-border">
        {items.map((t) => {
          const Icon = getCategoryIcon(t.categoryIcon);
          const expense = t.type === "expense";
          return (
            <li key={t.id} className="flex min-h-16 items-center gap-3.5 py-2">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary dark:bg-primary/15">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{t.categoryName}</p>
                <p className="truncate text-[13px] text-muted-foreground">
                  {[formatDate(t.date), t.accountName, t.note].filter(Boolean).join(" · ")}
                </p>
              </div>
              {t.isAdjustment && <Badge variant="outline">Ajuste</Badge>}
              <span className={cn("shrink-0 text-[15px] font-semibold", !expense && "text-income")}>
                {expense ? "−" : "+"}
                {formatPen(t.amountCents)}
              </span>
            </li>
          );
        })}
      </ul>
    </DashboardSection>
  );
}
