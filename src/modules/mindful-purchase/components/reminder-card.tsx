"use client";

import { Hourglass } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/action-result";
import { formatPen } from "@/lib/money";
import {
  useDeleteAvoided,
  useDismissReminder,
  useSetAvoidedStatus,
} from "@/modules/avoided-purchases/hooks/use-avoided-mutations";
import { useDueReminders } from "@/modules/avoided-purchases/hooks/use-due-reminders";
import type { AvoidedItem } from "@/modules/avoided-purchases/types/avoided.types";
import { DashboardSection } from "@/modules/dashboard/components/dashboard-section";
import { useQuickAdd } from "@/modules/quick-add/hooks/use-quick-add";

import { useMindfulSettings } from "../hooks/use-mindful-settings";

function Reminder({ item }: { item: AvoidedItem }) {
  const { open } = useQuickAdd();
  const remove = useDeleteAvoided();
  const setStatus = useSetAvoidedStatus();
  const dismiss = useDismissReminder();

  const what = item.note ?? item.categoryName ?? "algo";
  const busy = remove.isPending || setStatus.isPending || dismiss.isPending;
  const error = [remove, setStatus, dismiss].find((m) => m.isError);

  return (
    <li className="space-y-3 rounded-2xl bg-background p-4">
      <p className="text-sm">
        Pensabas comprar <span className="font-semibold">{what}</span> ({formatPen(item.amountCents)}). ¿Sigues
        queriéndola?
      </p>
      {error && <p className="text-sm text-destructive">{errorMessage(error.error)}</p>}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() =>
            // The purchase is no longer pending: the form takes over with the same amount and category.
            remove.mutate(item.id, {
              onSuccess: () =>
                open("expense", { prefill: { amountCents: item.amountCents, categoryId: item.categoryId } }),
            })
          }
        >
          Sí, la compraré
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() =>
            setStatus.mutate(
              { id: item.id, status: "avoided" },
              { onSuccess: () => toast.success(`Compra evitada · ${formatPen(item.amountCents)}`) },
            )
          }
        >
          Ya no la quiero
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => dismiss.mutate(item.id)}>
          Más tarde
        </Button>
      </div>
    </li>
  );
}

/** Inicio: a quiet reminder of the purchases you were thinking over, once their pause is over. */
export function ReminderCard() {
  const mindful = useMindfulSettings();
  const due = useDueReminders(mindful.enabled);

  if (!mindful.enabled || !due.data || due.data.length === 0) return null;

  return (
    <DashboardSection
      title="Lo que estabas pensando comprar"
      aside={<Hourglass aria-hidden="true" className="size-4 text-muted-foreground" />}
    >
      <ul className="space-y-3">
        {due.data.map((item) => (
          <Reminder key={item.id} item={item} />
        ))}
      </ul>
    </DashboardSection>
  );
}
