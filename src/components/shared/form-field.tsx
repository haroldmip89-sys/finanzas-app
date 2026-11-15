import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";

type FormFieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
};

export function FormField({ label, htmlFor, error, hint, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error && (
        <p className="text-[13px] text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p role="alert" className="text-[13px] font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
