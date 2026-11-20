"use client";

import { Hourglass, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/action-result";
import { todayInLima } from "@/lib/dates";
import { penToCents } from "@/lib/money";
import { useSaveAvoided } from "@/modules/avoided-purchases/hooks/use-avoided-mutations";
import { AVOIDED_NOTE_MAX } from "@/modules/avoided-purchases/schemas/avoided.schema";

import { useMindfulSettings } from "../hooks/use-mindful-settings";

type LargePurchaseHintProps = {
  /** The amount as typed in the expense form ("89.90"). */
  amount: string;
  categoryId: string;
  note: string;
  /** Called after the purchase was postponed, to close the expense form. */
  onDone: () => void;
};

/**
 * A soft, dismissible line under the amount of a new expense that is above the
 * user's threshold. It never blocks or delays saving: "Pensarlo" is optional.
 */
export function LargePurchaseHint({ amount, categoryId, note, onDone }: LargePurchaseHintProps) {
  const mindful = useMindfulSettings();
  const save = useSaveAvoided();
  const [dismissed, setDismissed] = useState(false);

  const cents = penToCents(amount);
  if (!mindful.enabled || dismissed || cents === null || cents < mindful.settings.thresholdCents) {
    return null;
  }

  const think = () => {
    save.mutate(
      {
        input: {
          amountCents: cents,
          date: todayInLima(),
          categoryId: categoryId || null,
          note: note.trim().slice(0, AVOIDED_NOTE_MAX) || null,
          status: "postponed",
          remindInMinutes: mindful.settings.pauseMinutes,
        },
      },
      {
        onSuccess: () => {
          toast.success("Compra pospuesta. Te lo recordaremos.");
          onDone();
        },
      },
    );
  };

  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-2xl border border-border bg-background p-3 text-sm"
    >
      <Hourglass aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 space-y-2">
        <p>Es una compra grande para ti. ¿Quieres pensarla?</p>
        {save.isError && <p className="text-destructive">{errorMessage(save.error)}</p>}
        <Button type="button" variant="outline" size="sm" onClick={think} disabled={save.isPending}>
          {save.isPending ? "Guardando..." : "Pensarlo"}
        </Button>
      </div>
      <button
        type="button"
        aria-label="Cerrar aviso"
        onClick={() => setDismissed(true)}
        className="flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
