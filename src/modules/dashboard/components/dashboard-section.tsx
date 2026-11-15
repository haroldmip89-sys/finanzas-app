import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type DashboardSectionProps = {
  title: string;
  /** Right-aligned figure or link in the header. */
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
};

/** Card shell shared by the dashboard sections. */
export function DashboardSection({ title, aside, className, children }: DashboardSectionProps) {
  return (
    <section
      aria-label={title}
      className={cn(
        "min-w-0 space-y-3 rounded-[20px] border border-border bg-card p-4 text-card-foreground md:p-5",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function SectionSkeleton({ title }: { title: string }) {
  return (
    <DashboardSection title={title}>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-4 w-56" />
    </DashboardSection>
  );
}
