"use client";

import { useState } from "react";

import { ErrorMessage } from "@/components/shared/error-message";
import { formatPen } from "@/lib/money";
import { cn } from "@/lib/utils";

import { compareTrend, cumulative } from "../dashboard-math";
import { useDailySpending } from "../hooks/use-daily-spending";
import { previousMonthName } from "../month-labels";
import { DashboardSection, SectionSkeleton } from "./dashboard-section";
import { TrendChart } from "./trend-chart";

const TITLE = "Evolución del gasto";

function signed(cents: number): string {
  return cents < 0 ? `−${formatPen(-cents)}` : formatPen(cents);
}

/** Running spending of the month against last month up to the same day. */
export function SpendingTrend() {
  const query = useDailySpending();
  const [day, setDay] = useState<number | null>(null);

  if (query.isPending) return <SectionSkeleton title={TITLE} />;
  if (query.isError) {
    return (
      <ErrorMessage
        message="No pudimos cargar la evolución de tus gastos. Tus datos están a salvo."
        onRetry={() => query.refetch()}
      />
    );
  }

  const { currentDaily, previousDaily } = query.data;
  const month = previousMonthName();
  const total = currentDaily.reduce((a, b) => a + b, 0) + previousDaily.reduce((a, b) => a + b, 0);

  if (total === 0) {
    return (
      <DashboardSection title={TITLE}>
        <p className="text-sm text-muted-foreground">
          Aún no registras gastos este mes ni a esta altura de {month}.
        </p>
      </DashboardSection>
    );
  }

  const days = currentDaily.length;
  const currentTotals = cumulative(currentDaily);
  const previousTotals = cumulative(previousDaily);
  const trend = compareTrend(currentDaily, previousDaily);
  const selected = Math.min(day ?? days, days);
  const previousAtDay = previousTotals[selected - 1];
  const less = trend.diffCents < 0;

  const description = `Gasto acumulado hasta el día ${days}: este mes ${formatPen(trend.currentCents)}, ${month} ${formatPen(trend.previousCents)}.`;

  return (
    <DashboardSection title={TITLE}>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
        <li className="flex items-center gap-2">
          <svg aria-hidden="true" width="22" height="6" className="shrink-0">
            <line x1="1" x2="21" y1="3" y2="3" className="stroke-chart-1" strokeWidth={3} strokeLinecap="round" />
          </svg>
          Este mes
        </li>
        <li className="flex items-center gap-2">
          <svg aria-hidden="true" width="22" height="6" className="shrink-0">
            <line x1="1" x2="21" y1="3" y2="3" className="stroke-muted-foreground" strokeWidth={2} strokeDasharray="5 4" strokeLinecap="round" />
          </svg>
          {month[0].toUpperCase() + month.slice(1)} (hasta el mismo día)
        </li>
      </ul>

      <TrendChart
        current={currentTotals}
        previous={previousTotals}
        selectedDay={selected}
        description={description}
      />

      {days > 1 && (
        <div className="space-y-1.5">
          <label htmlFor="trend-day" className="text-[13px] font-semibold">
            Consultar día
          </label>
          <input
            id="trend-day"
            type="range"
            min={1}
            max={days}
            value={selected}
            onChange={(e) => setDay(Number(e.target.value))}
            aria-valuetext={`Día ${selected}`}
            className="h-11 w-full accent-primary"
          />
        </div>
      )}

      <p aria-live="polite" className="text-sm">
        <span className="font-semibold">Día {selected}</span>
        <span className="text-muted-foreground"> · acumulado este mes </span>
        <span className="font-semibold">{formatPen(currentTotals[selected - 1])}</span>
        <span className="text-muted-foreground"> · {month} </span>
        <span className="font-semibold">
          {previousAtDay === undefined ? "—" : formatPen(previousAtDay)}
        </span>
      </p>

      <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-background p-4 text-sm">
        <div>
          <dt className="text-[13px] text-muted-foreground">Este mes</dt>
          <dd className="font-bold">{formatPen(trend.currentCents)}</dd>
        </div>
        <div>
          <dt className="text-[13px] text-muted-foreground">
            {month[0].toUpperCase() + month.slice(1)}
          </dt>
          <dd className="font-bold">{formatPen(trend.previousCents)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[13px] text-muted-foreground">Diferencia</dt>
          <dd className={cn("font-semibold", less && "text-success")}>
            {trend.diffCents === 0 ? "Igual" : `${signed(trend.diffCents)} ${less ? "menos" : "más"}`}
            {" · "}
            {trend.pct === null ? "—" : `${trend.pct > 0 ? "+" : trend.pct < 0 ? "−" : ""}${Math.abs(trend.pct)} %`}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[13px] text-muted-foreground">Promedio diario</dt>
          <dd className="font-semibold">
            {formatPen(trend.currentAvgCents)}
            <span className="font-normal text-muted-foreground"> este mes · </span>
            {formatPen(trend.previousAvgCents)}
            <span className="font-normal text-muted-foreground"> {month}</span>
          </dd>
        </div>
      </dl>

      <details className="rounded-2xl border border-border">
        <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-semibold">
          Ver datos por día
        </summary>
        <div className="max-h-64 overflow-auto px-4 pb-3">
          <table className="w-full text-left text-[13px]">
            <caption className="sr-only">Gasto acumulado por día</caption>
            <thead className="text-muted-foreground">
              <tr>
                <th scope="col" className="py-1.5 pr-2 font-semibold">Día</th>
                <th scope="col" className="py-1.5 pr-2 text-right font-semibold">Gasto del día</th>
                <th scope="col" className="py-1.5 pr-2 text-right font-semibold">Este mes</th>
                <th scope="col" className="py-1.5 text-right font-semibold">{month[0].toUpperCase() + month.slice(1)}</th>
              </tr>
            </thead>
            <tbody>
              {currentDaily.map((cents, i) => (
                <tr key={i} className="border-t border-border">
                  <th scope="row" className="py-1.5 pr-2 font-medium">{i + 1}</th>
                  <td className="py-1.5 pr-2 text-right">{formatPen(cents)}</td>
                  <td className="py-1.5 pr-2 text-right">{formatPen(currentTotals[i])}</td>
                  <td className="py-1.5 text-right">
                    {previousTotals[i] === undefined ? "—" : formatPen(previousTotals[i])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </DashboardSection>
  );
}
