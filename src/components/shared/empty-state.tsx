import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-input px-6 py-12 text-center">
      {Icon && (
        <span className="flex size-14 items-center justify-center rounded-full bg-primary/12 text-primary dark:bg-primary/15">
          <Icon aria-hidden="true" className="size-7" />
        </span>
      )}
      <div className="space-y-1">
        <p className="text-[17px] font-semibold">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
