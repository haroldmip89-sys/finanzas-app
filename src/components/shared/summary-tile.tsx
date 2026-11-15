type SummaryTileProps = {
  label: string;
  value: string;
  /** Short clarification under the value (e.g. a comparison). */
  note?: string;
};

/** A figure with its label, for the summaries at the top of a page. */
export function SummaryTile({ label, value, note }: SummaryTileProps) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card p-4 text-card-foreground">
      <p className="text-[13px] font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-[22px] leading-7 font-bold tabular-nums">{value}</p>
      {note && <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
