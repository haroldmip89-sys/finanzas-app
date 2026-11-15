import { cn } from "@/lib/utils";

type ProgressBarProps = {
  /** Width of the bar, 0 to 100. */
  value: number;
  /** Accessible name, e.g. "Comida: 40 % del presupuesto". */
  label: string;
  /** Fill colour by state; the state is always given as text elsewhere too. */
  tone?: "default" | "success" | "warning" | "over";
  className?: string;
};

export function ProgressBar({ value, label, tone = "default", className }: ProgressBarProps) {
  const width = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(width)}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] motion-reduce:transition-none",
          tone === "over" && "bg-expense",
          tone === "warning" && "bg-warning",
          tone === "success" && "bg-success",
          tone === "default" && "bg-primary",
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
