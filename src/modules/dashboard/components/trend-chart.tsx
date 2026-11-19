import { formatPen } from "@/lib/money";

import { niceMax } from "../dashboard-math";

type TrendChartProps = {
  /** Running totals of this month, one value per day from day 1. */
  current: number[];
  /** Running totals of last month, up to the same day (can be shorter). */
  previous: number[];
  /** 1-based day highlighted by the slider. */
  selectedDay: number;
  description: string;
};

const W = 320;
const H = 150;
const LEFT = 8;
const RIGHT = 8;
const TOP = 12;
const BOTTOM = 24;

/** Running spending of this month (solid) against last month (dashed). */
export function TrendChart({ current, previous, selectedDay, description }: TrendChartProps) {
  const days = current.length;
  const max = niceMax(Math.max(...current, ...previous, 0));
  const plotW = W - LEFT - RIGHT;
  const plotH = H - TOP - BOTTOM;

  const x = (day: number) => (days === 1 ? LEFT + plotW / 2 : LEFT + ((day - 1) / (days - 1)) * plotW);
  const y = (cents: number) => TOP + (1 - cents / max) * plotH;
  const points = (series: number[]) => series.map((v, i) => `${x(i + 1)},${y(v)}`).join(" ");

  const sel = Math.min(Math.max(selectedDay, 1), days);
  const ticks = Array.from(new Set([1, Math.ceil(days / 2), days]));

  return (
    <svg
      role="img"
      aria-label={description}
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
    >
      {[0, 0.5, 1].map((t) => (
        <g key={t} aria-hidden="true">
          <line
            x1={LEFT}
            x2={W - RIGHT}
            y1={TOP + t * plotH}
            y2={TOP + t * plotH}
            className="stroke-border"
            strokeWidth={1}
          />
        </g>
      ))}
      <text x={LEFT} y={TOP - 3} className="fill-muted-foreground text-[9px]" aria-hidden="true">
        {formatPen(max)}
      </text>

      <g aria-hidden="true">
        <line x1={x(sel)} x2={x(sel)} y1={TOP} y2={TOP + plotH} className="stroke-input" strokeWidth={1} />
        {previous.length > 1 && (
          <polyline
            points={points(previous)}
            fill="none"
            className="stroke-muted-foreground"
            strokeWidth={2}
            strokeDasharray="5 4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {current.length > 1 && (
          <polyline
            points={points(current)}
            fill="none"
            className="stroke-chart-1"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {previous[sel - 1] !== undefined && (
          <circle cx={x(sel)} cy={y(previous[sel - 1])} r={3.5} className="fill-card stroke-muted-foreground" strokeWidth={2} />
        )}
        <circle cx={x(sel)} cy={y(current[sel - 1])} r={4} className="fill-card stroke-chart-1" strokeWidth={2.5} />
        {ticks.map((d) => (
          <text
            key={d}
            x={x(d)}
            y={H - 6}
            textAnchor={d === 1 && days > 1 ? "start" : d === days && days > 1 ? "end" : "middle"}
            className="fill-muted-foreground text-[10px]"
          >
            {d}
          </text>
        ))}
      </g>
    </svg>
  );
}
