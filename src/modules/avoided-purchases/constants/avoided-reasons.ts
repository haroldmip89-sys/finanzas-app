import type { AvoidedReason } from "../types/avoided.types";

export const AVOIDED_REASON_OPTIONS: { value: AvoidedReason; label: string }[] = [
  { value: "not_needed", label: "No lo necesito" },
  { value: "out_of_budget", label: "Fuera de presupuesto" },
  { value: "can_wait", label: "Puedo esperar" },
  { value: "other", label: "Otro" },
];

export function reasonLabel(reason: AvoidedReason | null): string | null {
  return AVOIDED_REASON_OPTIONS.find((o) => o.value === reason)?.label ?? null;
}
